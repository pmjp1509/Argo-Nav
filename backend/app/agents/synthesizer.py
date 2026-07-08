"""Synthesizer — turns the orchestrator's typed evidence into the final answer.

Composes the scientific explanation (grounded ONLY in evidence, citing knowledge
sources, never inventing numbers) plus chart_data, sources, confidence, warnings,
and follow-ups. Numbers come from the evidence objects, not the LLM.
"""
from __future__ import annotations

import json
import logging

from app.agents.orchestrator import AgentRun
from app.llm.client import llm
from app.models.contracts import AgentResponse, ChartSpec, Citation

log = logging.getLogger(__name__)

SYNTH_SYSTEM = (
    "You are an oceanography research assistant. Using ONLY the provided evidence, "
    "write a clear, concise, cautious scientific explanation for the user's question. "
    "Cite knowledge sources by their title in square brackets, e.g. [DATA_MODE 'D']. "
    "NEVER invent numbers not present in the evidence. If a tool failed or evidence is "
    "missing, say so honestly. Return a JSON object: "
    '{"explanation": "...", "follow_ups": ["...", "..."]}.')


def synthesize(run: AgentRun) -> AgentResponse:
    kn = [e for e in run.evidence if e.tool == "knowledge_search" and e.ok]
    sq = [e for e in run.evidence if e.tool == "sql_tool" and e.ok]
    pf = [e for e in run.evidence if e.tool == "profile_tool" and e.ok]
    failed = [e for e in run.evidence if not e.ok]

    # No tools ran (e.g. smalltalk / refusal) -> use the model's draft directly.
    if not run.evidence:
        return AgentResponse(context=run.draft_answer or "I couldn't find an answer.",
                             confidence=0.3, tools_used=run.tools_used)

    sources = [Citation(doc_id=r["id"], title=r["title"], source=r.get("source"),
                        snippet=(r.get("content") or "")[:200])
               for e in kn for r in e.data.get("results", [])[:4]]

    out = llm.json_object(_bundle(run.question, kn, sq, pf, failed), system=SYNTH_SYSTEM)
    explanation = out.get("explanation") or run.draft_answer or "I couldn't produce an answer."
    follow_ups = [f for f in (out.get("follow_ups") or []) if isinstance(f, str)][:3]

    # SQL-derived fields
    sql = sq[0].data.get("sql") if sq else None
    data_preview, float_ids = None, []
    if sq:
        d = sq[0].data
        data_preview = {"columns": d.get("columns"), "rows": d.get("rows", [])[:15],
                        "row_count": d.get("row_count")}
        float_ids = _float_ids_from_rows(d.get("rows", []))

    # Profile-derived fields (chart + warnings + floats)
    chart, warnings = None, []
    if pf:
        spec = pf[0].data.get("chart_spec")
        if spec:
            try:
                chart = ChartSpec(**spec)
            except Exception as exc:  # noqa: BLE001
                log.warning("chart spec invalid: %s", exc)
        for e in pf:
            warnings.extend(e.data.get("warnings", []))
            fid = e.data.get("float_id")
            if fid and fid not in float_ids:
                float_ids.append(fid)
        if data_preview is None:
            data_preview = {"profiles": {e.data.get("float_id"): e.data.get("summary") for e in pf}}

    warnings.extend(f"{e.tool} failed: {e.error}" for e in failed)

    return AgentResponse(
        context=explanation, sql=sql, data_preview=data_preview, float_ids=float_ids,
        chart_data=chart, sources=sources, confidence=_confidence(sq, pf, kn, failed),
        warnings=warnings, follow_ups=follow_ups, tools_used=run.tools_used)


# ---------------------------------------------------------------------------
def _bundle(question, kn, sq, pf, failed) -> str:
    parts = [f"User question: {question}\n"]
    if kn:
        parts.append("KNOWLEDGE:\n" + "\n".join(
            f"- [{r['title']}] {r['content'][:400]}"
            for e in kn for r in e.data.get("results", [])[:5]))
    if sq:
        d = sq[0].data
        parts.append(f"SQL RESULT (sql={d.get('sql')}):\nrow_count={d.get('row_count')}, "
                     f"columns={d.get('columns')}\nrows={json.dumps(d.get('rows', [])[:10], default=str)}")
    for e in pf:
        parts.append(f"PROFILE float {e.data.get('float_id')} cycles={e.data.get('cycles')}: "
                     f"summary={json.dumps(e.data.get('summary'), default=str)} "
                     f"warnings={e.data.get('warnings')}")
    if failed:
        parts.append("FAILED TOOLS:\n" + "\n".join(f"- {e.tool}: {e.error}" for e in failed))
    parts.append("\nWrite the JSON answer now.")
    return "\n\n".join(parts)


def _float_ids_from_rows(rows: list[dict]) -> list[str]:
    ids, seen = [], set()
    for r in rows:
        for key in ("float_id", "platform_number"):
            if key in r and r[key] is not None and str(r[key]) not in seen:
                seen.add(str(r[key]))
                ids.append(str(r[key]))
    return ids


def _confidence(sq, pf, kn, failed) -> float:
    if failed and not (sq or pf or kn):
        return 0.2
    c = 0.4 + (0.25 if sq else 0) + (0.2 if pf else 0) + (0.15 if kn else 0) - (0.15 if failed else 0)
    return round(min(max(c, 0.1), 0.95), 2)
