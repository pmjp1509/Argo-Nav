"""Request pipeline — replaced to drive the agent (orchestrator -> synthesizer).

Kept the `run_pipeline(query)` entry point so the existing /ask and /query routes
work unchanged. The agent is synchronous (blocking LLM/DB I/O) so we run it in a
thread to avoid blocking the event loop.
"""
from __future__ import annotations

import asyncio
import logging
import time

from app.agents.orchestrator import run_agent
from app.agents.synthesizer import synthesize
from app.core.config import settings
from app.core.query_log import log_query
from app.models.contracts import AgentResponse

log = logging.getLogger(__name__)


def _friendly_error(exc: Exception) -> tuple[str, str]:
    """Map any internal exception to (error_code, user-safe message).
    Never leaks provider payloads, tool names, SQL, or stack traces."""
    s = str(exc).lower()
    if any(k in s for k in ("rate limit", "tokens per day", "tpd", "quota", "429", "exhaust", "credit", "billing", "resource_exhausted")):
        return "credits", "You've reached the free AI usage limit for now. Please try again later."
    if any(k in s for k in ("timed out", "timeout", "connection", "network", "unreachable", "failed to establish")):
        return "network", "Unable to reach the AI service. Please check your connection and try again."
    if any(k in s for k in ("503", "502", "500", "unavailable", "internal server")):
        return "unavailable", "The AI service is temporarily unavailable. Please try again shortly."
    return "unknown", "Something went wrong while answering. Please try again."


async def run_pipeline(query: str, user_id: str | None = None) -> AgentResponse:
    return await asyncio.to_thread(_run_sync, query, user_id)


def _run_sync(query: str, user_id: str | None) -> AgentResponse:
    t0 = time.time()
    try:
        run = run_agent(query)
        resp = synthesize(run)
    except Exception as exc:  # noqa: BLE001
        log.exception("pipeline failed")            # full detail stays in server logs
        latency = int((time.time() - t0) * 1000)
        code, friendly = _friendly_error(exc)
        log_query(nl_query=query, status="error", error=str(exc)[:500], latency_ms=latency,
                  model=settings.LLM_PROVIDER, user_id=user_id)
        return AgentResponse(context=friendly, confidence=0.0, error_code=code)

    latency = int((time.time() - t0) * 1000)
    row_count = resp.data_preview.get("row_count") if isinstance(resp.data_preview, dict) else None
    log_query(nl_query=query, sql=resp.sql, row_count=row_count,
              status="ok" if not resp.warnings else "partial", latency_ms=latency,
              tools_used=resp.tools_used or None, model=settings.LLM_PROVIDER, user_id=user_id)
    return resp
