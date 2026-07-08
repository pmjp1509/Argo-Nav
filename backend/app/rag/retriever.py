"""Hybrid retriever over the knowledge base.

Pipeline:  dense (pgvector cosine) + keyword (Postgres full-text)
           -> Reciprocal Rank Fusion  -> cross-encoder rerank  -> top-k

Two entry points:
    search_knowledge(query)      -> knowledge docs (definitions, handbook, schema)
    search_sql_examples(query)   -> NL->SQL few-shot examples for the SQL tool
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from app.core.config import settings
from app.db.postgres import get_conn
from app.rag import embeddings

log = logging.getLogger(__name__)


@dataclass
class Retrieved:
    id: Any
    title: str
    content: str          # text used for reranking / display
    source: str | None = None
    payload: dict = field(default_factory=dict)   # extra columns (e.g. sql)
    score: float = 0.0


def _vec_literal(vec: list[float]) -> str:
    """pgvector text input, e.g. '[0.1,0.2,...]'. Cast with %s::vector in SQL —
    robust regardless of whether the psycopg2 adapter is registered (a plain
    Python list would otherwise adapt to numeric[], which has no <=> operator)."""
    return "[" + ",".join(map(str, vec)) + "]"


def _reciprocal_rank_fusion(ranked_lists: list[list[Retrieved]], k: int = 60) -> list[Retrieved]:
    """Combine several ranked lists into one. RRF is robust and needs no score
    calibration between dense and keyword rankers."""
    scores: dict[Any, float] = {}
    best: dict[Any, Retrieved] = {}
    for lst in ranked_lists:
        for rank, item in enumerate(lst):
            scores[item.id] = scores.get(item.id, 0.0) + 1.0 / (k + rank + 1)
            best.setdefault(item.id, item)
    fused = list(best.values())
    for item in fused:
        item.score = scores[item.id]
    fused.sort(key=lambda r: -r.score)
    return fused


# ---------------------------------------------------------------------------
# Generic hybrid search over one table
# ---------------------------------------------------------------------------
def _hybrid(query: str, *, table: str, text_col: str, extra_cols: tuple[str, ...],
            title_expr: str, k: int, candidate_k: int, rerank: bool) -> list[Retrieved]:
    qvec = _vec_literal(embeddings.embed_query(query))
    cols = f"id, {title_expr} AS title, {text_col} AS content" + \
           ("".join(f", {c}" for c in extra_cols))

    with get_conn() as conn, conn.cursor() as cur:
        # dense (cosine distance operator <=>); cast the literal to vector
        cur.execute(
            f"SELECT {cols} FROM argo.{table} WHERE embedding IS NOT NULL "
            f"ORDER BY embedding <=> %s::vector LIMIT %s", (qvec, candidate_k))
        dense = _rows_to_retrieved(cur, extra_cols)

        # keyword (full-text; on-the-fly tsvector is fine for a small table)
        cur.execute(
            f"SELECT {cols} FROM argo.{table} "
            f"WHERE to_tsvector('english', coalesce({title_expr},'') || ' ' || coalesce({text_col},'')) "
            f"      @@ plainto_tsquery('english', %s) "
            f"ORDER BY ts_rank(to_tsvector('english', coalesce({text_col},'')), "
            f"                 plainto_tsquery('english', %s)) DESC LIMIT %s",
            (query, query, candidate_k))
        keyword = _rows_to_retrieved(cur, extra_cols)

    fused = _reciprocal_rank_fusion([dense, keyword])
    if not fused:
        return []

    if rerank and settings.RERANK_ENABLED:
        try:
            scores = embeddings.rerank_scores(query, [r.content for r in fused])
            for r, s in zip(fused, scores):
                r.score = s
            fused.sort(key=lambda r: -r.score)
        except Exception as exc:  # noqa: BLE001
            log.warning("rerank failed, using RRF order: %s", exc)

    return fused[:k]


def _rows_to_retrieved(cur, extra_cols) -> list[Retrieved]:
    names = [d[0] for d in cur.description]
    out = []
    for row in cur.fetchall():
        rec = dict(zip(names, row))
        out.append(Retrieved(
            id=rec["id"], title=rec.get("title") or "", content=rec.get("content") or "",
            source=rec.get("source"),
            payload={c: rec.get(c) for c in extra_cols if c not in ("source",)}))
    return out


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def search_knowledge(query: str, k: int = 5, candidate_k: int = 20,
                     rerank: bool = True) -> list[Retrieved]:
    return _hybrid(query, table="knowledge_docs", text_col="content",
                   extra_cols=("source",), title_expr="title",
                   k=k, candidate_k=candidate_k, rerank=rerank)


def search_sql_examples(query: str, k: int = 5, candidate_k: int = 15,
                        rerank: bool = True) -> list[Retrieved]:
    return _hybrid(query, table="sql_examples", text_col="nl_question",
                   extra_cols=("sql",), title_expr="nl_question",
                   k=k, candidate_k=candidate_k, rerank=rerank)
