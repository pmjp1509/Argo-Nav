from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str

    # Embeddings
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # LLM (Groq)
    GROQ_API_KEY: str
    GROQ_MODEL: str = "llama3-8b-8192"

    # PremSQL
    PREMSQL_MODEL: str = "premai-io/prem-1B-SQL"
    PREMSQL_DEVICE: str = "cpu"

    model_config = {
        "env_file": ".env",
        "extra": "ignore",
    }

settings = Settings()
