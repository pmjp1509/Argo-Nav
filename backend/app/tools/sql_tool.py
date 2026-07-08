"""SQL tool: schema+example-aware generation → validate → EXPLAIN → execute → repair.

LLM-agnostic (uses the provider-routed `llm`). Retrieves few-shot examples and
schema docs from the knowledge base so generation is grounded, then enforces
safety with the AST validator + read-only executor. On failure it feeds the exact
error back and retries.
"""
from __future__ import annotations

import logging

from app.llm.client import llm
from app.models.contracts import ToolResult
from app.rag import retriever
from app.sql import executor
from app.sql.validator import validate_sql

log = logging.getLogger(__name__)

MAX_ATTEMPTS = 3

# Compact, always-present schema so generation works even if retrieval is thin.
SCHEMA_REFERENCE = """
CORE SCHEMA (PostgreSQL, schema `argo`):
- argo.floats(platform_number PK, platform_type, pi_name, float_type['core'|'bgc'],
    deploy_date, is_active, n_cycles)
- argo.profiles(profile_id PK, platform_number FK, cycle_number, direction, juld timestamptz,
    latitude, longitude, geom geography(Point), region_id, data_mode, max_pres, n_levels)
- argo.profile_param_stats(profile_id FK, parameter['TEMP'|'PSAL'|'PRES'|'DOXY'|...],
    min_value, max_value, mean_value, n_valid, profile_qc)
- argo.trajectory(platform_number, cycle_number, ts, geom)
- argo.profile_parquet_index(profile_id FK, parquet_uri, min_pres, max_pres)  -- raw arrays live in Parquet

RULES:
- SELECT only. Always join profiles.platform_number = floats.platform_number.
- Per-parameter stats: join profile_param_stats ON profile_id and filter parameter=...
- Spatial "near <place>": ST_DWithin(p.geom, ST_SetSRID(ST_MakePoint(lon,lat),4326)::geography, metres).
- Time filters on profiles.juld. Do NOT reference raw TEMP/PRES/PSAL level arrays (they are in Parquet).
- Always include a LIMIT.
""".strip()

SYSTEM = ("You are an expert PostgreSQL query generator for an Argo float database. "
          "Return ONLY a JSON object: {\"sql\": \"<single SELECT>\", \"tables_used\": [..]}. "
          "No prose, no markdown.")


def _build_prompt(question: str, docs, examples, entities: dict | None) -> str:
    ex_block = "\n\n".join(f"Q: {e.title}\nSQL: {e.payload.get('sql')}" for e in examples) or "(none)"
    doc_block = "\n".join(f"- {d.title}: {d.content}" for d in docs) or "(none)"
    ent_block = f"\nExtracted entities: {entities}" if entities else ""
    return (f"{SCHEMA_REFERENCE}\n\n"
            f"Relevant schema/domain notes:\n{doc_block}\n\n"
            f"Similar solved examples:\n{ex_block}\n"
            f"{ent_block}\n\n"
            f"User question: {question}\n\n"
            f"Generate the PostgreSQL SELECT that answers it.")


def run_sql_tool(question: str, entities: dict | None = None,
                 max_attempts: int = MAX_ATTEMPTS) -> ToolResult:
    try:
        examples = retriever.search_sql_examples(question, k=5)
        docs = retriever.search_knowledge(question, k=6)
    except Exception as exc:  # noqa: BLE001
        log.warning("retrieval failed in sql_tool: %s", exc)
        examples, docs = [], []

    prompt = _build_prompt(question, docs, examples, entities)
    errors: list[str] = []

    for attempt in range(1, max_attempts + 1):
        out = llm.json_object(prompt, system=SYSTEM)
        candidate = (out.get("sql") or "").strip()
        if not candidate:
            errors.append("model returned no sql")
            continue

        v = validate_sql(candidate)
        if not v.ok:
            errors.append(v.error or "invalid")
            prompt = _repair(prompt, candidate, v.error)
            continue

        try:
            executor.explain(v.sql)                 # dry-run, no execution cost
        except Exception as exc:                    # noqa: BLE001
            errors.append(str(exc).strip())
            prompt = _repair(prompt, v.sql, str(exc))
            continue

        result = executor.run(v.sql)
        return ToolResult(tool="sql_tool", ok=True, data={
            "sql": v.sql, "attempts": attempt,
            "columns": result["columns"], "rows": result["rows"],
            "row_count": result["row_count"], "truncated": result["truncated"],
            "examples_used": [e.title for e in examples],
        })

    return ToolResult(tool="sql_tool", ok=False,
                      error="Could not produce a valid query after "
                            f"{max_attempts} attempts. Last errors: {' | '.join(errors[-2:])}")


def _repair(prompt: str, bad_sql: str, error: str | None) -> str:
    return (f"{prompt}\n\nThe previous SQL was invalid:\n{bad_sql}\nError: {error}\n"
            f"Fix it and return corrected JSON only.")
