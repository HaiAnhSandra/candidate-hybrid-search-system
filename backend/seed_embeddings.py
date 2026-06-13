import os
import sys
from typing import List, Tuple

import psycopg2
from pgvector.psycopg2 import register_vector
from sentence_transformers import SentenceTransformer


BATCH_SIZE = 16
PROGRESS_EVERY = 10
PRIMARY_MODEL = "thenlper/gte-base"
FALLBACK_MODEL = "intfloat/e5-base-v2"


def load_model() -> Tuple[SentenceTransformer, str]:
    try:
        model = SentenceTransformer(PRIMARY_MODEL)
        return model, "gte"
    except Exception as exc:  # pragma: no cover - best effort model fallback
        print(f"Primary model load failed: {exc}. Falling back to {FALLBACK_MODEL}.")
        model = SentenceTransformer(FALLBACK_MODEL)
        return model, "e5"


def normalize_texts(texts: List[str], model_type: str) -> List[str]:
    cleaned = [text if text is not None else "" for text in texts]
    if model_type == "e5":
        return [f"passage: {text}" for text in cleaned]
    return cleaned


def embed_texts(
    model: SentenceTransformer, model_type: str, texts: List[str]
) -> List[List[float]]:
    normalized = normalize_texts(texts, model_type)
    embeddings = model.encode(
        normalized,
        batch_size=BATCH_SIZE,
        normalize_embeddings=True,
    )
    return [embedding.tolist() for embedding in embeddings]


def fetch_batch(cur, batch_size: int):
    cur.execute(
        """
        SELECT
            candidate_id,
            holistic_summary_text,
            career_trajectory_text,
            experience_block_text
        FROM candidates
        WHERE holistic_vector IS NULL
        ORDER BY candidate_id
        LIMIT %s;
        """,
        (batch_size,),
    )
    return cur.fetchall()


def main() -> int:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL is not set.")
        return 1

    model, model_type = load_model()

    total_processed = 0
    conn = psycopg2.connect(database_url)
    register_vector(conn)

    try:
        with conn:
            with conn.cursor() as cur:
                while True:
                    rows = fetch_batch(cur, BATCH_SIZE)
                    if not rows:
                        break

                    candidate_ids = [row[0] for row in rows]
                    holistic_texts = [row[1] for row in rows]
                    career_texts = [row[2] for row in rows]
                    experience_texts = [row[3] for row in rows]

                    holistic_vectors = embed_texts(model, model_type, holistic_texts)
                    career_vectors = embed_texts(model, model_type, career_texts)
                    experience_vectors = embed_texts(model, model_type, experience_texts)

                    for idx, candidate_id in enumerate(candidate_ids):
                        cur.execute(
                            """
                            UPDATE candidates
                            SET
                                holistic_vector = %s,
                                career_trajectory_vector = %s,
                                experience_vector = %s
                            WHERE candidate_id = %s;
                            """,
                            (
                                holistic_vectors[idx],
                                career_vectors[idx],
                                experience_vectors[idx],
                                candidate_id,
                            ),
                        )

                        total_processed += 1
                        if total_processed % PROGRESS_EVERY == 0:
                            print(f"Embedded {total_processed} candidates...")

        print(f"Done. Embedded {total_processed} candidates.")
    finally:
        conn.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
