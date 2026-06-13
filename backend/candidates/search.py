import asyncio
import hashlib
import json
import re
import struct
import time
from typing import Any, Dict, Iterable, List, Tuple
from uuid import UUID


from sentence_transformers import CrossEncoder
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from candidates.models import Candidate
from candidates.query_understanding import ExtractedEntities, extract_entities
from candidates.schemas import CandidateCard, SearchQuery, SearchResponse
from core.config import settings
from core.constants import expand_related_skills
from core.embedder import embed


_reranker: CrossEncoder | None = None
_CACHE_SIMILARITY_THRESHOLD = 0.92
_CACHE_TTL_SECONDS = 3600
_NAME_QUERY_BLOCKLIST = {
    "engineer",
    "developer",
    "backend",
    "frontend",
    "fullstack",
    "full-stack",
    "devops",
    "qa",
    "tester",
    "java",
    "python",
    "react",
    "node",
    "sql",
    "postgresql",
    "hanoi",
    "ho chi minh",
    "senior",
    "junior",
    "lead",
    "fresher",
    "years",
    "with",
    "in",
    "using",
    "and",
    "or",
    "who",
    "built",
    "has",
}

try:
    import numpy as np
except ImportError:  # pragma: no cover - optional dependency fallback
    np = None


def _load_reranker() -> CrossEncoder:
    global _reranker
    if _reranker is None:
        _reranker = CrossEncoder(settings.RERANKER_MODEL, device=settings.DEVICE)
    return _reranker


def _expand_related_skills(skills: list[str]) -> list[str]:
    return expand_related_skills(skills)


def validate_search_intent(raw_query: str) -> str | None:
    """
    Validate that the query represents a genuine search intent.
    Returns error message string if invalid, None if valid.
    """
    if not raw_query or not raw_query.strip():
        return "Please enter a search query."

    query = raw_query.strip()

    if len(query) < 3:
        return "Query too short. Please describe the candidate you are looking for."

    if len(query) > 500:
        return "Query too long. Please summarize what you are looking for in a few sentences."

    if re.search(r"https?://|www\.", query, re.IGNORECASE):
        return "URLs are not supported. Please describe the candidate you are looking for."

    code_patterns = [
        r"def\s+\w+\s*\(",
        r"function\s+\w+\s*\(",
        r"class\s+\w+\s*[:{]",
        r"import\s+[\w.]+",
        r"SELECT\s+.+FROM",
        r"<[a-zA-Z][^>]*>",
        r'\{[\s\S]*"[\w]+"\s*:',
        r"```",
    ]
    for pattern in code_patterns:
        if re.search(pattern, query, re.IGNORECASE):
            return "Code snippets are not supported. Please describe the candidate you are looking for."

    navigational_patterns = [
        r"^how (do|can|to|should)",
        r"^what (is|are|does)",
        r"^where (is|can|do)",
        r"^(show|tell|explain|help)",
        r"^(how to filter|how to search|how to use)",
    ]
    for pattern in navigational_patterns:
        if re.search(pattern, query, re.IGNORECASE):
            return (
                "This looks like a navigation question. Use the filter bar for location, salary, and seniority. Type a job requirement to search for candidates."
            )

    if re.search(r"(.)\1{4,}", query):
        return "Invalid query. Please describe the candidate you are looking for."

    if re.match(r"^[\d\s\W]+$", query):
        return "Please include job title, skills, or role description in your query."

    return None


def _normalize_query_text(query: str) -> str:
    return re.sub(r"\s+", " ", query.lower()).strip()


def is_probable_name_query(query: str) -> bool:
    normalized_query = _normalize_query_text(query)
    if not normalized_query:
        return False

    if re.search(r"\d", normalized_query):
        return False

    words = normalized_query.split()
    if len(words) < 2 or len(words) > 4:
        return False

    for blocked_term in _NAME_QUERY_BLOCKLIST:
        if " " in blocked_term:
            if blocked_term in normalized_query:
                return False
        elif blocked_term in words:
            return False

    return True


def _vector_to_list(vector: Any) -> list[float]:
    if hasattr(vector, "tolist"):
        return [float(value) for value in vector.tolist()]
    return [float(value) for value in vector]


def _cosine_similarity(left: list[float], right: list[float]) -> float:
    if np is not None:
        left_arr = np.array(left, dtype=np.float32)
        right_arr = np.array(right, dtype=np.float32)
        denom = float(np.linalg.norm(left_arr) * np.linalg.norm(right_arr) + 1e-9)
        if denom == 0.0:
            return 0.0
        return float(np.dot(left_arr, right_arr) / denom)

    numerator = sum(x * y for x, y in zip(left, right))
    left_norm = sum(x * x for x in left) ** 0.5
    right_norm = sum(y * y for y in right) ** 0.5
    denom = (left_norm * right_norm) + 1e-9
    if denom == 0.0:
        return 0.0
    return float(numerator / denom)


async def get_cached_result(
    query_vector: list[float], redis_client
) -> SearchResponse | None:
    try:
        keys = await redis_client.keys("search_cache:vector:*")
        if not keys:
            return None

        best_similarity = 0.0
        best_key = None
        query_arr = _vector_to_list(query_vector)

        for key in keys:
            cached_vec_bytes = await redis_client.get(key)
            if not cached_vec_bytes:
                continue

            if np is not None:
                cached_vec = np.frombuffer(cached_vec_bytes, dtype=np.float32).tolist()
            else:
                cached_vec = list(struct.unpack(f"{len(cached_vec_bytes) // 4}f", cached_vec_bytes))

            similarity = _cosine_similarity(query_arr, cached_vec)

            if similarity > best_similarity:
                best_similarity = similarity
                best_key = key

        if best_similarity >= _CACHE_SIMILARITY_THRESHOLD and best_key:
            result_key = best_key.decode() if isinstance(best_key, bytes) else str(best_key)
            result_key = result_key.replace("vector:", "result:")
            cached_result = await redis_client.get(result_key)
            if cached_result:
                print(f"Cache HIT - similarity: {best_similarity:.3f}")
                data = json.loads(cached_result)
                return SearchResponse(**data)

        print(f"Cache MISS - best similarity: {best_similarity:.3f}")
        return None
    except Exception as e:
        print(f"Cache error: {e}")
        return None


async def set_cached_result(
    query_vector: list[float], result: SearchResponse, redis_client
) -> None:
    try:
        cache_id = hashlib.md5(str(query_vector[:10]).encode()).hexdigest()[:12]
        vec_key = f"search_cache:vector:{cache_id}"
        result_key = f"search_cache:result:{cache_id}"

        if np is not None:
            vec_bytes = np.array(query_vector, dtype=np.float32).tobytes()
        else:
            vec_bytes = struct.pack(f"{len(query_vector)}f", *query_vector)

        await redis_client.setex(vec_key, _CACHE_TTL_SECONDS, vec_bytes)
        await redis_client.setex(result_key, _CACHE_TTL_SECONDS, result.model_dump_json())
        print(f"Cache SET - key: {cache_id}")
    except Exception as e:
        print(f"Cache set error: {e}")


def _build_hard_filter(entities, technical_only: bool = False) -> Tuple[str, Dict[str, Any]]:
    clauses: List[str] = []
    params: Dict[str, Any] = {}

    if entities.location_city:
        clauses.append("location_city = :location_city")
        params["location_city"] = entities.location_city

    if entities.seniority_level_min is not None or entities.seniority_level_max is not None:
        if entities.seniority_level_min is not None and entities.seniority_level_max is not None:
            if entities.seniority_level_min == entities.seniority_level_max:
                clauses.append("seniority_level = :seniority_exact")
                params["seniority_exact"] = entities.seniority_level_min
            else:
                clauses.append("seniority_level BETWEEN :seniority_min AND :seniority_max")
                params["seniority_min"] = entities.seniority_level_min
                params["seniority_max"] = entities.seniority_level_max
        elif entities.seniority_level_min is not None:
            clauses.append("seniority_level >= :seniority_min")
            params["seniority_min"] = entities.seniority_level_min
        elif entities.seniority_level_max is not None:
            clauses.append("seniority_level <= :seniority_max")
            params["seniority_max"] = entities.seniority_level_max

    if entities.years_of_experience_min is not None:
        clauses.append("years_of_experience >= :yoe_min")
        params["yoe_min"] = entities.years_of_experience_min

    if entities.years_of_experience_max is not None:
        clauses.append("years_of_experience <= :yoe_max")
        params["yoe_max"] = entities.years_of_experience_max

    if entities.salary_min is not None:
        clauses.append("salary_expectation_min >= :salary_min")
        params["salary_min"] = entities.salary_min

    if entities.salary_max is not None:
        clauses.append("salary_expectation_max <= :salary_max")
        params["salary_max"] = entities.salary_max

    if entities.availability_status:
        clauses.append("availability_status = :availability_status")
        if hasattr(entities.availability_status, "value"):
            params["availability_status"] = entities.availability_status.value
        else:
            params["availability_status"] = entities.availability_status

    if entities.certifications:
        cert_clauses = []
        for i, cert in enumerate(entities.certifications):
            keyword = cert.replace(" Certified", "").replace(" certified", "").strip()
            cert_clauses.append(
                f"array_to_string(certifications, ' ') ILIKE :cert_{i}"
            )
            params[f"cert_{i}"] = f"%{keyword}%"
        clauses.append(f"({' OR '.join(cert_clauses)})")

    has_required = bool(entities.required_skills)
    has_related = bool(entities.related_skills)
    if has_required or has_related:
        clauses.append(
            """
            (
                skills_primary && :required_skills
                OR skills_secondary && :required_skills
                OR skills_exposure && :required_skills
                OR skills_primary && :related_skills
                OR skills_secondary && :related_skills
            )
            """
        )
        params["required_skills"] = (
            entities.required_skills if has_required else ["__no_match__"]
        )
        params["related_skills"] = (
            entities.related_skills if has_related else ["__no_match__"]
        )

    if entities.job_titles:
        title_conditions = []
        for i, title in enumerate(entities.job_titles):
            words = title.lower().split()
            for word in words:
                if len(word) > 4:
                    title_conditions.append(
                        f"array_to_string(job_titles_canonical, ' ') "
                        f"ILIKE :title_{i}_{words.index(word)}"
                    )
                    params[f"title_{i}_{words.index(word)}"] = f"%{word}%"
                    break
        if title_conditions:
            clauses.append(f"({' OR '.join(title_conditions)})")

    if technical_only:
        clauses.append("is_technical_degree = TRUE")

    where_clause = " AND ".join(clauses) if clauses else "TRUE"
    return where_clause, params


def _build_explicit_filters(query: SearchQuery) -> Tuple[str, Dict[str, Any]]:
    entities = ExtractedEntities(expanded_query=query.raw_query or "")
    entities.location_city = query.location_city
    entities.seniority_level_min = query.seniority_level
    entities.seniority_level_max = query.seniority_level
    entities.salary_min = query.salary_min
    entities.salary_max = query.salary_max
    entities.years_of_experience_min = query.experience_min
    entities.years_of_experience_max = query.experience_max
    entities.required_skills = query.required_skills or []
    entities.related_skills = _expand_related_skills(query.required_skills or [])
    entities.business_domains = query.business_domains or []
    return _build_hard_filter(entities, technical_only=query.technical_only)


async def search_candidates_by_name(
    query: str, filters: SearchQuery, db: AsyncSession
) -> List[CandidateCard]:
    normalized_query = _normalize_query_text(query)
    if not normalized_query:
        return []

    name_pattern = f"%{normalized_query}%"
    where_clause, params = _build_explicit_filters(filters)

    sql = text(
        f"""
        SELECT *,
               CASE
                   WHEN LOWER(CONCAT_WS(' ', first_name, last_name)) = :normalized_query THEN 100
                   WHEN LOWER(CONCAT_WS(' ', last_name, first_name)) = :normalized_query THEN 95
                   WHEN LOWER(CONCAT_WS(' ', first_name, last_name)) ILIKE :name_pattern THEN 90
                   WHEN LOWER(CONCAT_WS(' ', last_name, first_name)) ILIKE :name_pattern THEN 85
                   WHEN LOWER(COALESCE(first_name, '')) = :normalized_query THEN 80
                   WHEN LOWER(COALESCE(last_name, '')) = :normalized_query THEN 75
                   WHEN LOWER(COALESCE(first_name, '')) ILIKE :name_pattern THEN 70
                   WHEN LOWER(COALESCE(last_name, '')) ILIKE :name_pattern THEN 65
                   ELSE 50
               END AS name_rank
        FROM candidates
        WHERE {where_clause}
          AND (
              LOWER(CONCAT_WS(' ', first_name, last_name)) = :normalized_query
              OR LOWER(CONCAT_WS(' ', last_name, first_name)) = :normalized_query
              OR LOWER(COALESCE(first_name, '')) = :normalized_query
              OR LOWER(COALESCE(last_name, '')) = :normalized_query
              OR LOWER(CONCAT_WS(' ', first_name, last_name)) ILIKE :name_pattern
              OR LOWER(CONCAT_WS(' ', last_name, first_name)) ILIKE :name_pattern
              OR LOWER(COALESCE(first_name, '')) ILIKE :name_pattern
              OR LOWER(COALESCE(last_name, '')) ILIKE :name_pattern
          )
        ORDER BY
            CASE
                WHEN LOWER(CONCAT_WS(' ', first_name, last_name)) = :normalized_query THEN 100
                WHEN LOWER(CONCAT_WS(' ', last_name, first_name)) = :normalized_query THEN 95
                WHEN LOWER(CONCAT_WS(' ', first_name, last_name)) ILIKE :name_pattern THEN 90
                WHEN LOWER(CONCAT_WS(' ', last_name, first_name)) ILIKE :name_pattern THEN 85
                WHEN LOWER(COALESCE(first_name, '')) = :normalized_query THEN 80
                WHEN LOWER(COALESCE(last_name, '')) = :normalized_query THEN 75
                WHEN LOWER(COALESCE(first_name, '')) ILIKE :name_pattern THEN 70
                WHEN LOWER(COALESCE(last_name, '')) ILIKE :name_pattern THEN 65
                ELSE 50
            END DESC,
            candidate_id
        ;
        """
    )
    result = await db.execute(
        sql,
        {**params, "normalized_query": normalized_query, "name_pattern": name_pattern},
    )
    rows = result.mappings().all()

    candidates: List[CandidateCard] = []
    for row in rows:
        candidate_data = dict(row)
        candidate_data.pop("name_rank", None)
        candidate = Candidate(**candidate_data)
        card = CandidateCard.model_validate(candidate)
        card.relevance_score = float(row["name_rank"])
        candidates.append(card)

    return candidates


async def _hard_filter_candidate_ids(
    db: AsyncSession, where_clause: str, params: Dict[str, Any]
) -> List[UUID]:
    sql = text(
        f"""
        SELECT candidate_id
        FROM candidates
        WHERE {where_clause}
        LIMIT :limit;
        """
    )
    result = await db.execute(sql, {**params, "limit": settings.MAX_HARD_FILTER_RESULTS})
    return [UUID(str(row[0])) for row in result.fetchall()]


async def _fts_search(
    db: AsyncSession, expanded_query: str, candidate_ids: List[UUID]
) -> List[Tuple[str, float]]:
    if not candidate_ids:
        return []

    sql = text(
        """
        SELECT candidate_id,
               ts_rank(search_tsvector, websearch_to_tsquery('english', :query)) AS score
        FROM candidates
        WHERE candidate_id = ANY(:candidate_ids)
          AND search_tsvector @@ websearch_to_tsquery('english', :query)
        ORDER BY score DESC
        LIMIT 20;
        """
    )
    result = await db.execute(sql, {"query": expanded_query, "candidate_ids": candidate_ids})
    return [(str(row[0]), float(row[1])) for row in result.fetchall()]


async def _vector_search(
    db: AsyncSession, expanded_query: str, candidate_ids: List[UUID]
) -> List[Tuple[str, float]]:
        if not candidate_ids:
                return []

        query_vector = await asyncio.get_running_loop().run_in_executor(
                None, embed, expanded_query
        )
        vector_str = "[" + ",".join(str(x) for x in query_vector) + "]"

        sql = text(
                f"""
                SELECT candidate_id, MAX(score) AS score
                FROM (
                        (SELECT candidate_id,
                                        1 - (holistic_vector <=> '{vector_str}'::vector) AS score
                         FROM candidates
                         WHERE candidate_id = ANY(:candidate_ids)
                             AND holistic_vector IS NOT NULL
                         ORDER BY holistic_vector <=> '{vector_str}'::vector
                         LIMIT 20)

                        UNION ALL

                        (SELECT candidate_id,
                                        1 - (career_trajectory_vector <=> '{vector_str}'::vector) AS score
                         FROM candidates
                         WHERE candidate_id = ANY(:candidate_ids)
                             AND career_trajectory_vector IS NOT NULL
                         ORDER BY career_trajectory_vector <=> '{vector_str}'::vector
                         LIMIT 20)

                        UNION ALL

                        (SELECT candidate_id,
                                        1 - (experience_vector <=> '{vector_str}'::vector) AS score
                         FROM candidates
                         WHERE candidate_id = ANY(:candidate_ids)
                             AND experience_vector IS NOT NULL
                         ORDER BY experience_vector <=> '{vector_str}'::vector
                         LIMIT 20)
                ) AS ranked
                GROUP BY candidate_id
                ORDER BY score DESC
                LIMIT 20;
                """
        )
        result = await db.execute(sql, {"candidate_ids": candidate_ids})
        return [(str(row[0]), float(row[1])) for row in result.fetchall()]


def _rrf_merge(
    fts_results: Iterable[Tuple[str, float]],
    vector_results: Iterable[Tuple[str, float]],
) -> List[Tuple[str, float]]:
    scores: Dict[str, float] = {}

    for rank, (candidate_id, _score) in enumerate(fts_results, start=1):
        scores[candidate_id] = scores.get(candidate_id, 0.0) + 1.0 / (
            settings.RRF_K + rank
        )

    for rank, (candidate_id, _score) in enumerate(vector_results, start=1):
        scores[candidate_id] = scores.get(candidate_id, 0.0) + 1.0 / (
            settings.RRF_K + rank
        )

    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    return ranked[: settings.TOP_K_RETRIEVAL]


async def _fetch_summaries(
    db: AsyncSession, candidate_ids: List[UUID]
) -> Dict[str, str]:
    if not candidate_ids:
        return {}

    sql = text(
        """
        SELECT candidate_id, holistic_summary_text
        FROM candidates
        WHERE candidate_id = ANY(:candidate_ids);
        """
    )
    result = await db.execute(sql, {"candidate_ids": candidate_ids})
    return {str(row[0]): (row[1] or "") for row in result.fetchall()}


def _normalize_scores(scores: List[float]) -> List[float]:
    if not scores:
        return []

    min_score = min(scores)
    max_score = max(scores)
    if max_score == min_score:
        return [100.0 for _ in scores]

    return [max(10.0, ((score - min_score) / (max_score - min_score)) * 100) for score in scores]


async def _rerank(
    db: AsyncSession, candidate_ids: List[UUID], expanded_query: str
) -> List[Tuple[str, float]]:
    if not candidate_ids:
        return []

    summaries = await _fetch_summaries(db, candidate_ids)
    ordered_ids = [cid for cid in candidate_ids if str(cid) in summaries]
    if not ordered_ids:
        return []

    reranker = _load_reranker()
    pairs = [(expanded_query, summaries[str(cid)]) for cid in ordered_ids]
    raw_scores = await asyncio.get_running_loop().run_in_executor(
        None, reranker.predict, pairs
    )
    normalized_scores = _normalize_scores(list(raw_scores))

    ranked = sorted(
        zip(ordered_ids, normalized_scores), key=lambda item: item[1], reverse=True
    )
    return [(str(candidate_id), score) for candidate_id, score in ranked[: settings.TOP_K_RERANK]]


async def _fetch_candidates(
    db: AsyncSession, candidate_ids: List[UUID]
) -> Dict[str, Candidate]:
    if not candidate_ids:
        return {}

    sql = text(
        """
        SELECT *
        FROM candidates
        WHERE candidate_id = ANY(:candidate_ids);
        """
    )
    result = await db.execute(sql, {"candidate_ids": candidate_ids})
    rows = result.mappings().all()

    candidates: Dict[str, Candidate] = {}
    for row in rows:
        candidate = Candidate(**row)
        candidates[str(candidate.candidate_id)] = candidate

    return candidates

async def search_candidates(query: SearchQuery, db: AsyncSession) -> SearchResponse:
    start_time = time.perf_counter()

    if query.raw_query:
        validation_error = validate_search_intent(query.raw_query)
        if validation_error:
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            return SearchResponse(
                query=query.raw_query,
                total_found=0,
                candidates=[],
                search_time_ms=elapsed_ms,
                error=validation_error,
            )

        if is_probable_name_query(query.raw_query):
            name_results = await search_candidates_by_name(query.raw_query, query, db)
            if name_results:
                elapsed_ms = (time.perf_counter() - start_time) * 1000
                return SearchResponse(
                    query=query.raw_query,
                    total_found=len(name_results),
                    candidates=name_results,
                    search_time_ms=elapsed_ms,
                )

    redis_client = None
    query_vector = None

    if query.raw_query:
        try:
            import redis.asyncio as aioredis

            redis_client = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=False,
                socket_connect_timeout=2,
                socket_timeout=2,
            )
            await redis_client.ping()
            query_vector = await asyncio.get_running_loop().run_in_executor(
                None, embed, query.raw_query
            )
            cached = await get_cached_result(query_vector, redis_client)
            if cached:
                elapsed_ms = (time.perf_counter() - start_time) * 1000
                cached.search_time_ms = elapsed_ms
                cached.query = query.raw_query
                return cached
        except Exception as e:
            print(f"Redis unavailable - skipping cache: {e}")
            query_vector = None
            redis_client = None

    try:
        entities = await extract_entities(query.raw_query)

        if query.location_city:
            entities.location_city = query.location_city
        if query.seniority_level is not None:
            entities.seniority_level_min = query.seniority_level
            entities.seniority_level_max = query.seniority_level
        if query.availability_status:
            entities.availability_status = query.availability_status
        if query.salary_min is not None:
            entities.salary_min = query.salary_min
        if query.salary_max is not None:
            entities.salary_max = query.salary_max
        if query.experience_min is not None:
            entities.years_of_experience_min = query.experience_min
        if query.experience_max is not None:
            entities.years_of_experience_max = query.experience_max
        if query.required_skills:
            entities.required_skills = query.required_skills
            entities.related_skills = _expand_related_skills(query.required_skills)
        if query.business_domains:
            entities.expanded_query = (
                entities.expanded_query + " " + " ".join(query.business_domains)
            )

        where_clause, params = _build_hard_filter(
            entities, technical_only=query.technical_only
        )
        candidate_ids = await _hard_filter_candidate_ids(db, where_clause, params)

        if entities.job_titles:
            current_title_terms = entities.job_titles[0]
            entities.expanded_query = (
                current_title_terms
                + " "
                + current_title_terms
                + " "
                + entities.expanded_query
                + " "
                + " ".join(entities.job_titles)
            )

        if not candidate_ids:
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            response = SearchResponse(
                query=query.raw_query,
                total_found=0,
                candidates=[],
                search_time_ms=elapsed_ms,
            )
            if redis_client and query_vector is not None:
                await set_cached_result(query_vector, response, redis_client)
            return response

        fts_results, vector_results = await asyncio.gather(
            _fts_search(db, entities.expanded_query, candidate_ids),
            _vector_search(db, entities.expanded_query, candidate_ids),
        )

        merged = _rrf_merge(fts_results, vector_results)
        merged_ids = [candidate_id for candidate_id, _score in merged]
        merged_uuid_ids = [UUID(candidate_id) for candidate_id in merged_ids]

        reranked = await _rerank(db, merged_uuid_ids, entities.expanded_query)
        reranked_ids = [candidate_id for candidate_id, _score in reranked]
        score_map = {candidate_id: score for candidate_id, score in reranked}

        candidates_map = await _fetch_candidates(
            db, [UUID(candidate_id) for candidate_id in reranked_ids]
        )
        candidate_cards: List[CandidateCard] = []

        for candidate_id in reranked_ids:
            candidate = candidates_map.get(candidate_id)
            if candidate is None:
                continue
            card = CandidateCard.model_validate(candidate)
            card.relevance_score = score_map.get(candidate_id)
            candidate_cards.append(card)

        elapsed_ms = (time.perf_counter() - start_time) * 1000
        response = SearchResponse(
            query=query.raw_query,
            total_found=len(candidate_cards),
            candidates=candidate_cards,
            search_time_ms=elapsed_ms,
        )
        if redis_client and query_vector is not None:
            await set_cached_result(query_vector, response, redis_client)
        return response
    finally:
        if redis_client is not None:
            try:
                await redis_client.aclose()
            except Exception:
                pass
