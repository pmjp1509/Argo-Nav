from fastapi import APIRouter

from app.api.v1.ask import router as ask_router
from app.api.v1.health import router as health_router
from app.api.v1.schema import router as schema_router
from app.api.v1.query import router as query_router
from app.api.v1.floats import router as float_router
from app.api.v1.knowledge import router as knowledge_router
from app.api.v1.stats import router as stats_router
from app.api.v1.sql import router as sql_router
from app.api.v1.monitor import router as monitor_router

router = APIRouter()
router.include_router(ask_router, tags=["ask"])
router.include_router(health_router, tags=["health"])
router.include_router(schema_router, tags=["schema"])
router.include_router(query_router, tags=["query"])
router.include_router(float_router, tags=["floats"])
router.include_router(knowledge_router, tags=["knowledge"])
router.include_router(stats_router, tags=["stats"])
router.include_router(sql_router, tags=["sql"])
router.include_router(monitor_router, tags=["monitor"])
