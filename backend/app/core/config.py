from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ---- Database ----
    DATABASE_URL: str
    # Read-only role for the SQL agent (falls back to DATABASE_URL if unset).
    DATABASE_URL_READONLY: str | None = None

    # ---- Supabase ----
    SUPABASE_URL: str | None = None
    SUPABASE_ANON_KEY: str | None = None
    SUPABASE_SERVICE_ROLE_KEY: str | None = None
    SUPABASE_STORAGE_BUCKET: str = "argo-parquet"

    # ---- LLM provider routing (swap via .env only) ----
    LLM_PROVIDER: str = "gemini"            # primary: gemini | groq
    LLM_FALLBACK_PROVIDER: str | None = "groq"

    # Gemini (primary)
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Groq (fallback + fast path)
    GROQ_API_KEY: str | None = None
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    FAST_MODEL: str = "llama-3.1-8b-instant"     # cheap tasks (intent, rewrite)

    # ---- Retrieval (local, free) ----
    EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"   # 384-dim; matches vector(384)
    RERANKER_MODEL: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"   # ~80MB CPU cross-encoder
    RERANK_ENABLED: bool = True

    # ---- Parquet / DuckDB ----
    PARQUET_BACKEND: str = "supabase"        # local | supabase
    PARQUET_LOCAL_DIR: str = "./data/parquet"

    def readonly_url(self) -> str:
        return self.DATABASE_URL_READONLY or self.DATABASE_URL

    model_config = {
        "env_file": ".env",
        "extra": "ignore",
    }


settings = Settings()
