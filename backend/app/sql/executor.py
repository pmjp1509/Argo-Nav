"""Read-only SQL execution.

Defense in depth on top of the AST validator:
  - connects using DATABASE_URL_READONLY when provided (a GRANT-limited role),
  - forces every statement into a READ ONLY transaction with a statement_timeout,
so even if a mutating statement slipped past validation it physically cannot run.
"""
from __future__ import annotations

import logging

import psycopg2

from app.core.config import settings

log = logging.getLogger(__name__)

STATEMENT_TIMEOUT_MS = 5000
ROW_CAP = 5000


def _conn():
    return psycopg2.connect(settings.readonly_url())


def explain(sql: str) -> None:
    """Dry-run validation via EXPLAIN. Raises psycopg2 error on invalid SQL."""
    with _conn() as conn, conn.cursor() as cur:
        cur.execute("SET LOCAL statement_timeout = %s", (STATEMENT_TIMEOUT_MS,))
        cur.execute("SET LOCAL transaction_read_only = on")
        cur.execute(f"EXPLAIN {sql}")
        conn.rollback()


def run(sql: str) -> dict:
    """Execute a validated SELECT. Returns {columns, rows, row_count, truncated}."""
    with _conn() as conn, conn.cursor() as cur:
        cur.execute("SET LOCAL statement_timeout = %s", (STATEMENT_TIMEOUT_MS,))
        cur.execute("SET LOCAL transaction_read_only = on")
        cur.execute(sql)
        columns = [d[0] for d in cur.description] if cur.description else []
        rows = cur.fetchmany(ROW_CAP + 1)
        conn.rollback()

    truncated = len(rows) > ROW_CAP
    rows = rows[:ROW_CAP]
    dict_rows = [dict(zip(columns, r)) for r in rows]
    return {"columns": columns, "rows": dict_rows, "row_count": len(dict_rows),
            "truncated": truncated}
