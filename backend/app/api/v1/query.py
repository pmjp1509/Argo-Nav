from fastapi import APIRouter, HTTPException
from app.models.request import AskRequest
from app.services.pipeline import run_pipeline
from typing import List, Dict

router = APIRouter()


@router.post("/query")
async def query_endpoint(req: AskRequest):
    """Full pipeline: embed -> vdb -> text2sql -> sql -> parquet load/QC -> summarize"""
    try:
        result = await run_pipeline(req.query)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



