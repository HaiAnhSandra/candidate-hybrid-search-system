from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    DATABASE_URL: str
    EMBEDDING_MODEL: str = "intfloat/e5-base-v2"
    EMBEDDING_DIM: int = 768
    RERANKER_MODEL: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    ANTHROPIC_API_KEY: str
    LLM_MODEL_PARSE: str = "claude-sonnet-4-6"
    LLM_MODEL_QUERY: str = "claude-haiku-4-5-20251001"
    TOP_K_RETRIEVAL: int = 20
    TOP_K_RERANK: int = 10
    RRF_K: int = 60
    MAX_HARD_FILTER_RESULTS: int = 500
    REDIS_URL: str = "redis://localhost:6379/0"
    DEVICE: str = "cpu"


settings = Settings()
