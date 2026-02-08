from app.db.postgres import get_conn
from typing import List, Tuple, Any

def search_vectors(embedding: List[float], top_k: int = 5) -> List[Tuple[Any, ...]]:
    """Search the argo_embeddings table using pgvector if available.
    Returns list of tuples: (float_id, cycle_number, summary)
    Falls back to returning the latest entries if pgvector query fails."""
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                # Try pgvector similarity operator
                cur.execute(
                    "SELECT float_id, cycle_number, summary FROM argo_embeddings ORDER BY embedding <-> %s LIMIT %s",
                    (embedding, top_k),
                )
                return cur.fetchall()
    except Exception:
        # Fallback: return recent embeddings
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT float_id, cycle_number, summary FROM argo_embeddings ORDER BY created_at DESC LIMIT %s", (top_k,))
                return cur.fetchall()
