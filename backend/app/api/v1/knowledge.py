"""Knowledge base endpoints (browse + hybrid search) — powers the Knowledge page."""
from fastapi import APIRouter, Query

from app.db.postgres import dict_rows, get_conn
from app.models.api_models import KnowledgeDoc
from app.rag import retriever

router = APIRouter()


@router.get("/knowledge", response_model=list[KnowledgeDoc])
def knowledge(q: str | None = Query(None, description="hybrid search; omit to browse all"),
              limit: int = Query(50, le=200)):
    if q:
        hits = retriever.search_knowledge(q, k=limit)
        return [{"id": h.id, "source": h.source, "title": h.title,
                 "content": h.content, "score": round(float(h.score), 3)} for h in hits]
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT id, source, title, content FROM argo.knowledge_docs "
                    "ORDER BY source, title LIMIT %s", (limit,))
        return dict_rows(cur)
