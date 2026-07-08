"""Embedding + reranking models (local, free, loaded once).

Uses the model named in EMBEDDING_MODEL (bge-small-en-v1.5, 384-dim) so vectors
match the vector(384) columns AND the seeding step (etl.knowledge). BGE models
want an instruction prefix on the QUERY side only; passages are embedded raw.
"""
from __future__ import annotations

from functools import lru_cache

from app.core.config import settings

_BGE_QUERY_PREFIX = "Represent this sentence for searching relevant passages: "


@lru_cache(maxsize=1)
def _model():
    from sentence_transformers import SentenceTransformer
    return SentenceTransformer(settings.EMBEDDING_MODEL)


@lru_cache(maxsize=1)
def _reranker():
    from sentence_transformers import CrossEncoder
    return CrossEncoder(settings.RERANKER_MODEL)


def _is_bge() -> bool:
    return "bge" in settings.EMBEDDING_MODEL.lower()


def embed_query(text: str) -> list[float]:
    text = (_BGE_QUERY_PREFIX + text) if _is_bge() else text
    return _model().encode(text, normalize_embeddings=True).tolist()


def embed_passage(text: str) -> list[float]:
    return _model().encode(text, normalize_embeddings=True).tolist()


def rerank_scores(query: str, passages: list[str]) -> list[float]:
    """Cross-encoder relevance scores (higher = more relevant)."""
    if not passages:
        return []
    scores = _reranker().predict([(query, p) for p in passages])
    return [float(s) for s in scores]
