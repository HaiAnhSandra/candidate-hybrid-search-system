from threading import Lock
from typing import List

from sentence_transformers import SentenceTransformer

from core.config import settings


EMBEDDING_DIM = 768

_model: SentenceTransformer | None = None
_model_lock = Lock()


def _load_model() -> SentenceTransformer:
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                _model = SentenceTransformer(settings.EMBEDDING_MODEL, device=settings.DEVICE)
    return _model


def _zero_vector() -> List[float]:
    return [0.0] * EMBEDDING_DIM


def embed(text: str) -> List[float]:
    if text is None or text.strip() == "":
        return _zero_vector()

    model = _load_model()
    vector = model.encode([text], normalize_embeddings=True)[0]
    return vector.tolist()


def embed_batch(texts: List[str]) -> List[List[float]]:
    if not texts:
        return []

    non_empty_indices: List[int] = []
    non_empty_texts: List[str] = []

    for idx, text in enumerate(texts):
        if text is not None and text.strip() != "":
            non_empty_indices.append(idx)
            non_empty_texts.append(text)

    outputs: List[List[float]] = [_zero_vector() for _ in texts]
    if not non_empty_texts:
        return outputs

    model = _load_model()
    vectors = model.encode(non_empty_texts, normalize_embeddings=True)

    for idx, vector in zip(non_empty_indices, vectors):
        outputs[idx] = vector.tolist()

    return outputs
