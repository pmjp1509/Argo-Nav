"""SQL Playground endpoint — read-only, validated execution (reuses the SQL agent's safety)."""
from fastapi import APIRouter, HTTPException

from app.models.api_models import SqlRunRequest, SqlRunResult
from app.sql import executor
from app.sql.validator import validate_sql

router = APIRouter()


@router.post("/sql/run", response_model=SqlRunResult)
def sql_run(req: SqlRunRequest):
    v = validate_sql(req.sql)
    if not v.ok:
        raise HTTPException(400, f"Rejected: {v.error}")
    try:
        result = executor.run(v.sql)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(400, str(exc).splitlines()[0])
    return {"sql": v.sql, **result}
