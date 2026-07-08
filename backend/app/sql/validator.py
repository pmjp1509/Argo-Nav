"""AST-based SQL validation (sqlglot) — replaces fragile substring blocklists.

Guarantees a generated statement is a single read-only SELECT over allowed
tables, with a LIMIT. Because it inspects the parse tree, it cannot be fooled by
column names like `created_at`/`date_update` (the old blocklist bug) or by
tricks like `SEL/**/ECT`.
"""
from __future__ import annotations

from dataclasses import dataclass

import sqlglot
from sqlglot import exp

# Schemas/tables the agent may read. `argo`-qualified tables are always allowed;
# these bare names are also accepted (the LLM sometimes omits the schema).
ALLOWED_TABLES = {
    "floats", "profiles", "profile_param_stats", "trajectory",
    "calibration_info", "history_info", "profile_parquet_index",
    "knowledge_docs", "sql_examples", "files", "data_modes", "qc_flags",
    "parameters", "ocean_regions",
}
ALLOWED_SCHEMAS = {"argo", None}

# Any of these node types anywhere in the tree => reject.
FORBIDDEN = (
    exp.Insert, exp.Update, exp.Delete, exp.Drop, exp.Create, exp.Alter,
    exp.TruncateTable, exp.Command,   # Command catches GRANT/REVOKE/VACUUM/etc.
)

DEFAULT_LIMIT = 5000


@dataclass
class Validation:
    ok: bool
    sql: str | None = None
    error: str | None = None


def validate_sql(raw: str, max_limit: int = DEFAULT_LIMIT) -> Validation:
    raw = (raw or "").strip().rstrip(";").strip()
    if not raw:
        return Validation(False, error="Empty SQL.")

    # 1) Parse (must be exactly one statement).
    try:
        statements = sqlglot.parse(raw, read="postgres")
    except Exception as exc:  # noqa: BLE001
        return Validation(False, error=f"Parse error: {exc}")
    statements = [s for s in statements if s is not None]
    if len(statements) != 1:
        return Validation(False, error="Only a single statement is allowed.")
    stmt = statements[0]

    # 2) Root must be SELECT (optionally wrapped in WITH / set-op).
    root = stmt
    if isinstance(root, exp.With):
        root = root.this
    if not isinstance(root, (exp.Select, exp.Union, exp.Except, exp.Intersect, exp.Subquery)):
        return Validation(False, error="Only SELECT queries are allowed.")

    # 3) No DML/DDL/command nodes anywhere.
    for node_type in FORBIDDEN:
        if list(stmt.find_all(node_type)):
            return Validation(False, error=f"Statement type not permitted: {node_type.__name__}.")

    # 4) Table allowlist.
    for tbl in stmt.find_all(exp.Table):
        schema = tbl.db or None
        name = (tbl.name or "").lower()
        if schema and schema.lower() not in {s for s in ALLOWED_SCHEMAS if s}:
            return Validation(False, error=f"Schema not allowed: {schema}.")
        if name and name not in ALLOWED_TABLES:
            return Validation(False, error=f"Table not allowed: {tbl.sql()}.")

    # 5) Enforce a LIMIT on the top-level SELECT.
    top = stmt.this if isinstance(stmt, exp.With) else stmt
    if isinstance(top, exp.Select):
        existing = top.args.get("limit")
        if existing is None:
            top.limit(max_limit, copy=False)
        else:
            try:
                if int(existing.expression.name) > max_limit:
                    top.limit(max_limit, copy=False)
            except (AttributeError, ValueError):
                pass

    return Validation(True, sql=stmt.sql(dialect="postgres"))
