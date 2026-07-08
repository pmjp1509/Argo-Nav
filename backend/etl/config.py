"""Central config + shared connections for the ETL package."""
import os
import logging
from functools import lru_cache

import psycopg2
from dotenv import load_dotenv

load_dotenv()  # reads backend/.env

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("etl")

# --- required ---
DATABASE_URL = os.environ["DATABASE_URL"]

# --- optional ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

PARQUET_BACKEND = os.getenv("PARQUET_BACKEND", "local").lower()   # local | supabase
PARQUET_LOCAL_DIR = os.getenv("PARQUET_LOCAL_DIR", "./data/parquet")
SUPABASE_STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "argo-parquet")


def get_conn():
    """New psycopg2 connection (autocommit off; caller commits per file)."""
    return psycopg2.connect(DATABASE_URL)


@lru_cache(maxsize=1)
def get_embedder():
    """Lazy-load the sentence-transformers model once."""
    from sentence_transformers import SentenceTransformer
    log.info("Loading embedding model: %s", EMBEDDING_MODEL)
    return SentenceTransformer(EMBEDDING_MODEL)


@lru_cache(maxsize=1)
def get_supabase():
    """Supabase client for Storage uploads (only when PARQUET_BACKEND=supabase)."""
    from supabase import create_client
    if not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY):
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for storage upload")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
