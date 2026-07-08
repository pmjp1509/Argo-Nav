"""Profile tool: depth-resolved arrays (PRES vs TEMP/PSAL/...) from Parquet via DuckDB.

Used for profile / "below N m" / comparison questions. Resolves a float (and
optional cycle) to profile_ids, reads the level data, applies QC, and returns
depth series + a ready-to-render chart spec.
"""
from __future__ import annotations

import logging

from app.duck import engine
from app.models.contracts import ChartKind, ChartSpec, ToolResult
from app.db.postgres import get_conn

log = logging.getLogger(__name__)

GOOD_QC = {"1", "2", "5", "8"}
DEFAULT_PARAMS = ["TEMP", "PSAL"]
MAX_POINTS = 400


def _resolve(float_id: str, cycle_number: int | None) -> list[tuple[int, int]]:
    with get_conn() as conn, conn.cursor() as cur:
        if cycle_number is not None:
            cur.execute(
                "SELECT p.profile_id, p.cycle_number FROM argo.profiles p "
                "JOIN argo.profile_parquet_index i ON i.profile_id = p.profile_id "
                "WHERE p.platform_number = %s AND p.cycle_number = %s",
                (float_id, cycle_number))
        else:
            cur.execute(
                "SELECT p.profile_id, p.cycle_number FROM argo.profiles p "
                "JOIN argo.profile_parquet_index i ON i.profile_id = p.profile_id "
                "WHERE p.platform_number = %s ORDER BY p.juld DESC NULLS LAST LIMIT 1",
                (float_id,))
        return [(int(r[0]), int(r[1])) for r in cur.fetchall()]


def _qc_ok(series):
    """Normalize a QC column (bytes/str) to a boolean 'usable' mask."""
    def ok(v):
        if v is None:
            return False
        if isinstance(v, (bytes, bytearray)):
            v = bytes(v).decode("utf-8", "ignore")
        return str(v).strip() in GOOD_QC
    return series.map(ok)


def _downsample(points: list[dict]) -> list[dict]:
    if len(points) <= MAX_POINTS:
        return points
    step = len(points) / MAX_POINTS
    return [points[int(i * step)] for i in range(MAX_POINTS)]


def run_profile_tool(float_id: str, cycle_number: int | None = None,
                     parameters: list[str] | None = None, max_depth: float | None = None,
                     apply_qc: bool = True) -> ToolResult:
    params = [p.upper() for p in (parameters or DEFAULT_PARAMS)]
    targets = _resolve(float_id, cycle_number)
    if not targets:
        return ToolResult(tool="profile_tool", ok=False,
                          error=f"No stored profile with depth data for float {float_id}"
                                + (f" cycle {cycle_number}" if cycle_number else ""))

    pid_to_cycle = dict(targets)
    df = engine.read_profiles(list(pid_to_cycle.keys()))
    if df.empty or "PRES" not in df.columns:
        return ToolResult(tool="profile_tool", ok=False,
                          error="Parquet had no pressure/level data for the selected profiles.")

    available = [p for p in params if p in df.columns]
    if not available:
        return ToolResult(tool="profile_tool", ok=False,
                          error=f"None of {params} present; available: "
                                f"{[c for c in df.columns if c not in ('profile_id','cycle_number','direction','level')]}")

    series, summary, warnings = [], {}, []
    for pid, cycle in pid_to_cycle.items():
        sub = df[df["profile_id"] == pid]
        for param in available:
            raw = sub[["PRES", param]].dropna()
            d = raw
            qc_flagged = False
            if apply_qc and f"{param}_QC" in sub.columns:
                d = raw[_qc_ok(sub[f"{param}_QC"]).reindex(raw.index).values]
                if d.empty and not raw.empty:
                    # Every level failed QC (e.g. real-time flag 4). Show raw + warn.
                    d, qc_flagged = raw, True
                    warnings.append(f"{param} float {float_id} cy{cycle}: all levels flagged "
                                    f"by QC; showing unfiltered values.")
            if max_depth is not None:
                d = d[d["PRES"] <= float(max_depth)]
            if d.empty:
                continue
            d = d.sort_values("PRES")
            points = [{"x": float(v), "y": float(p)} for p, v in zip(d["PRES"], d[param])]
            series.append({"label": f"Float {float_id} cy{cycle} {param}",
                           "param": param, "cycle": cycle, "qc_flagged": qc_flagged,
                           "points": _downsample(points)})
            summary.setdefault(param, {})[f"{float_id}:{cycle}"] = {
                "n": int(len(d)), "min": float(d[param].min()),
                "max": float(d[param].max()), "mean": float(d[param].mean())}

    if not series:
        return ToolResult(tool="profile_tool", ok=False,
                          error="All levels were filtered out by QC / depth constraints.")

    primary = available[0]
    chart = ChartSpec(
        kind=ChartKind.profile_line,
        title=f"{primary} profile — float {float_id}",
        x_label=primary, y_label="Pressure (dbar)",
        series=[s for s in series if s["param"] == primary],
        meta={"invert_y": True, "params": available})

    return ToolResult(tool="profile_tool", ok=True, data={
        "float_id": float_id, "cycles": sorted(set(pid_to_cycle.values())),
        "parameters": available, "summary": summary, "warnings": warnings,
        "series": series, "chart_spec": chart.model_dump()})
