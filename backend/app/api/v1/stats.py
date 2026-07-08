"""Aggregate stats — powers the Dashboard and Analytics pages."""
from fastapi import APIRouter

from app.db.postgres import dict_rows, get_conn
from app.models.api_models import OverviewStats

router = APIRouter()


@router.get("/stats/overview", response_model=OverviewStats)
def overview():
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT (SELECT count(*) FROM argo.floats)                         AS floats,
                   (SELECT count(*) FROM argo.profiles)                       AS profiles,
                   (SELECT count(*) FROM argo.floats WHERE float_type='bgc')  AS bgc_floats,
                   (SELECT count(*) FROM argo.knowledge_docs)                 AS knowledge_docs,
                   (SELECT count(*) FROM argo.profile_parquet_index)          AS parquet_profiles,
                   (SELECT max(last_cycle_at) FROM argo.floats)               AS latest_cycle
        """)
        return dict_rows(cur)[0]


@router.get("/stats/coverage")
def coverage():
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT to_char(date_trunc('month', juld),'YYYY-MM') AS month, count(*) AS n "
                    "FROM argo.profiles WHERE juld IS NOT NULL GROUP BY 1 ORDER BY 1")
        by_month = dict_rows(cur)
        cur.execute("SELECT float_type, count(*) AS n FROM argo.floats GROUP BY 1 ORDER BY 2 DESC")
        by_type = dict_rows(cur)
        cur.execute("SELECT parameter, count(*) AS n FROM argo.profile_param_stats "
                    "GROUP BY 1 ORDER BY 2 DESC")
        by_param = dict_rows(cur)
    return {"by_month": by_month, "by_type": by_type, "by_param": by_param}
