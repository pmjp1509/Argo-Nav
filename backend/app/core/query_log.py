"""Best-effort query logging to app.query_history (never breaks a request)."""
from __future__ import annotations

import logging

from app.db.postgres import get_conn

log = logging.getLogger(__name__)


def log_query(*, nl_query: str, refined_query: str | None = None, intent: str | None = None,
              sql: str | None = None, row_count: int | None = None, status: str = "ok",
              latency_ms: int | None = None, tools_used: list[str] | None = None,
              model: str | None = None, prompt_tokens: int | None = None,
              completion_tokens: int | None = None, error: str | None = None,
              user_id: str | None = None) -> None:
    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                """insert into app.query_history
                   (user_id, nl_query, refined_query, intent, generated_sql, row_count,
                    status, latency_ms, tools_used, model, prompt_tokens, completion_tokens, error)
                   values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (user_id, nl_query, refined_query, intent, sql, row_count, status,
                 latency_ms, tools_used, model, prompt_tokens, completion_tokens, error))
            conn.commit()
    except Exception as exc:  # noqa: BLE001
        log.warning("query_log failed: %s", exc)
