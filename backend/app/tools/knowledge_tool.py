"""Knowledge tool: hybrid RAG over the knowledge base (definitions, handbook, QC, schema)."""
from __future__ import annotations

from app.models.contracts import ToolResult
from app.rag import retriever


def run_knowledge_tool(query: str, k: int = 5) -> ToolResult:
    if not (query or "").strip():
        return ToolResult(tool="knowledge_search", ok=False, error="empty query")
    hits = retriever.search_knowledge(query, k=k)
    return ToolResult(tool="knowledge_search", ok=True, data={
        "results": [{"id": h.id, "title": h.title, "content": h.content,
                     "source": h.source, "score": round(float(h.score), 3)} for h in hits]})
