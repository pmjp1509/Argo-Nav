"""Float data endpoints (read-only). Powers the Map, Explorer, and Float Details."""
from fastapi import APIRouter, HTTPException, Query

from app.db.postgres import dict_rows, get_conn
from app.models.api_models import Cycle, FloatDetail, FloatList, TrajectoryPoint
from app.tools.duckdb_tool import run_profile_tool

router = APIRouter()

_FLOAT_COLS = ("platform_number, platform_type, pi_name, project_name, data_centre, "
               "float_type, deploy_date, first_cycle_at, last_cycle_at, n_cycles, is_active")


@router.get("/floats", response_model=FloatList)
def list_floats(bbox: str | None = Query(None, description="minLon,minLat,maxLon,maxLat"),
                float_type: str | None = None, active: bool | None = None,
                q: str | None = Query(None, description="platform_number contains"),
                limit: int = Query(2000, le=5000), offset: int = 0):
    where, params = [], []
    if float_type:
        where.append("f.float_type = %s"); params.append(float_type)
    if active is not None:
        where.append("f.is_active = %s"); params.append(active)
    if q:
        where.append("f.platform_number ILIKE %s"); params.append(f"%{q}%")
    clause = (" WHERE " + " AND ".join(where)) if where else ""

    sql = f"""
        SELECT f.platform_number, f.float_type, f.n_cycles, f.is_active,
               f.last_cycle_at, f.deploy_date, lp.latitude, lp.longitude
        FROM argo.floats f
        LEFT JOIN LATERAL (
            SELECT latitude, longitude FROM argo.profiles p
            WHERE p.platform_number = f.platform_number
            ORDER BY juld DESC NULLS LAST LIMIT 1
        ) lp ON true
        {clause}
        ORDER BY f.n_cycles DESC NULLS LAST
        LIMIT %s OFFSET %s"""
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, [*params, limit, offset])
        items = dict_rows(cur)
        cur.execute(f"SELECT count(*) FROM argo.floats f{clause}", params)
        total = cur.fetchone()[0]

    if bbox:
        try:
            mnlon, mnlat, mxlon, mxlat = map(float, bbox.split(","))
            items = [i for i in items if i["longitude"] is not None
                     and mnlon <= i["longitude"] <= mxlon and mnlat <= i["latitude"] <= mxlat]
        except ValueError:
            pass
    return {"items": items, "total": total}


@router.get("/floats/{platform_number}", response_model=FloatDetail)
def float_detail(platform_number: str):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(f"SELECT {_FLOAT_COLS} FROM argo.floats WHERE platform_number = %s",
                    (platform_number,))
        rows = dict_rows(cur)
        if not rows:
            raise HTTPException(404, f"float {platform_number} not found")
        cur.execute(
            "SELECT cycle_number, juld, latitude, longitude, max_pres, data_mode "
            "FROM argo.profiles WHERE platform_number = %s ORDER BY cycle_number", (platform_number,))
        cycles = dict_rows(cur)
    return {"float": rows[0], "cycles": cycles}


@router.get("/floats/{platform_number}/trajectory", response_model=list[TrajectoryPoint])
def float_trajectory(platform_number: str):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT cycle_number, ts, latitude, longitude FROM argo.trajectory "
                    "WHERE platform_number = %s ORDER BY ts", (platform_number,))
        return dict_rows(cur)


@router.get("/floats/{platform_number}/param-stats")
def float_param_stats(platform_number: str, parameter: str = "TEMP"):
    """Per-cycle stats time-series for one parameter (for Analytics / Float Details)."""
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT p.cycle_number, p.juld, s.min_value, s.max_value, s.mean_value "
            "FROM argo.profiles p JOIN argo.profile_param_stats s ON s.profile_id = p.profile_id "
            "WHERE p.platform_number = %s AND s.parameter = %s ORDER BY p.cycle_number",
            (platform_number, parameter.upper()))
        return {"parameter": parameter.upper(), "points": dict_rows(cur)}


@router.get("/floats/{platform_number}/depth")
def float_depth(platform_number: str, cycle: int | None = None,
                parameters: str = "TEMP,PSAL", max_depth: float | None = None):
    """Depth-resolved arrays for one cycle (via DuckDB/Parquet)."""
    params = [p.strip().upper() for p in parameters.split(",") if p.strip()]
    r = run_profile_tool(platform_number, cycle, params, max_depth)
    if not r.ok:
        raise HTTPException(404, r.error)
    return r.data
