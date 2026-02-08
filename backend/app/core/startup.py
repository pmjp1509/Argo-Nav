import logging
import psycopg2
from sentence_transformers import SentenceTransformer
from app.core.config import settings

log = logging.getLogger(__name__)
embedder = None

async def startup_event():
    global embedder
    try:
        embedder = SentenceTransformer(settings.EMBEDDING_MODEL)
        log.info('Loaded embedding model: %s', settings.EMBEDDING_MODEL)
    except Exception as e:
        embedder = None
        log.error('Failed to load embedding model %s: %s', settings.EMBEDDING_MODEL, e)
        print(f"ERROR loading embedding model: {e}")

def get_conn():
    return psycopg2.connect(settings.DATABASE_URL)
