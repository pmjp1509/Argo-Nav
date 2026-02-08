from fastapi import APIRouter
from app.models.request import AskRequest
from app.models.response import AskResponse
from app.services.pipeline import run_pipeline

router = APIRouter()

@router.post("/ask", response_model=AskResponse)
async def ask(req: AskRequest):
    return await run_pipeline(req.query)
