"""MCP-compatible tool registry.

Each tool is declared as a ToolSpec (name + JSON-schema params) that the LLM sees,
plus a callable that returns a ToolResult. `execute_tool` dispatches a model tool
call; `compact_for_llm` shrinks a result to the essentials the model needs to keep
reasoning (full data is retained server-side for the final response).

The ToolSpec shape is intentionally MCP-compatible, so the same registry can later
be exposed via an MCP server without touching tool code.
"""
from __future__ import annotations

import json

from app.models.contracts import ToolResult, ToolSpec
from app.tools.knowledge_tool import run_knowledge_tool
from app.tools.duckdb_tool import run_profile_tool
from app.tools.sql_tool import run_sql_tool

# ---------------------------------------------------------------------------
# Declarations shown to the LLM
# ---------------------------------------------------------------------------
TOOL_SPECS: list[ToolSpec] = [
    ToolSpec(
        name="knowledge_search",
        description=("Look up Argo domain knowledge: definitions, terminology, QC flag "
                     "meanings, DATA_MODE, variable descriptions, handbook, schema notes. "
                     "Use for 'what is / explain / define' questions. Does NOT query data."),
        parameters={"type": "object", "properties": {
            "query": {"type": "string", "description": "what to look up"}},
            "required": ["query"]},
    ),
    ToolSpec(
        name="sql_query",
        description=("Answer questions about float metadata by generating and running SQL: "
                     "counts, filters, locations (near a place), dates, per-parameter stats, "
                     "rankings. Returns rows. Use for 'how many / show / list / which / where'."),
        parameters={"type": "object", "properties": {
            "question": {"type": "string",
                         "description": "the natural-language question to answer with SQL"}},
            "required": ["question"]},
    ),
    ToolSpec(
        name="profile_query",
        description=("Get depth-resolved profile arrays (e.g. temperature/salinity vs pressure) "
                     "for a float from Parquet. Use for 'show/compare the profile', 'variation "
                     "below N m'. Call once per float when comparing two floats."),
        parameters={"type": "object", "properties": {
            "float_id": {"type": "string", "description": "WMO platform number, e.g. '5902490'"},
            "cycle_number": {"type": "integer", "description": "specific cycle; omit for latest"},
            "parameters": {"type": "array", "items": {"type": "string"},
                           "description": "e.g. ['TEMP','PSAL']; default both"},
            "max_depth": {"type": "number", "description": "only levels with PRES <= this (dbar)"}},
            "required": ["float_id"]},
    ),
]


# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------
def execute_tool(name: str, args: dict) -> ToolResult:
    try:
        if name == "knowledge_search":
            return run_knowledge_tool(args.get("query", ""))
        if name == "sql_query":
            return run_sql_tool(args.get("question") or args.get("query", ""))
        if name == "profile_query":
            return run_profile_tool(
                float_id=str(args.get("float_id")),
                cycle_number=_as_int(args.get("cycle_number")),
                parameters=_as_list(args.get("parameters")),
                max_depth=_as_float(args.get("max_depth")))
        return ToolResult(tool=name, ok=False, error=f"unknown tool: {name}")
    except Exception as exc:  # noqa: BLE001
        return ToolResult(tool=name, ok=False, error=f"{type(exc).__name__}: {exc}")


# ---------------------------------------------------------------------------
# Compact result text fed back to the model (keeps token budget small)
# ---------------------------------------------------------------------------
def compact_for_llm(r: ToolResult, max_chars: int = 3500) -> str:
    if not r.ok:
        return f"ERROR from {r.tool}: {r.error}"
    d = r.data
    if r.tool == "knowledge_search":
        return json.dumps([{"title": x["title"], "text": x["content"][:400]}
                           for x in d.get("results", [])])[:max_chars]
    if r.tool == "sql_tool":
        return json.dumps({"sql": d.get("sql"), "row_count": d.get("row_count"),
                           "columns": d.get("columns"),
                           "rows": d.get("rows", [])[:5],
                           "truncated": d.get("truncated")}, default=str)[:max_chars]
    if r.tool == "profile_tool":
        return json.dumps({"float_id": d.get("float_id"), "cycles": d.get("cycles"),
                           "parameters": d.get("parameters"), "summary": d.get("summary"),
                           "warnings": d.get("warnings")}, default=str)[:max_chars]
    return json.dumps(d, default=str)[:max_chars]


def _as_int(v):
    try:
        return int(v) if v is not None else None
    except (TypeError, ValueError):
        return None


def _as_float(v):
    try:
        return float(v) if v is not None else None
    except (TypeError, ValueError):
        return None


def _as_list(v):
    if v is None:
        return None
    if isinstance(v, str):
        return [v]
    return list(v)
