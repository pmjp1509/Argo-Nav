from sentence_transformers import SentenceTransformer
from app.core import startup
from app.core.config import settings

def embed_query(text: str) -> list:
    # If startup failed or hasn't run, try to fix it here
    if startup.embedder is None:
        print("Model was None, attempting to load now...")
        startup.embedder = SentenceTransformer(settings.EMBEDDING_MODEL)
        
    return startup.embedder.encode(text).tolist()