from pydantic import BaseModel
from typing import Any

class AskResponse(BaseModel):
    sql: str
    refined_query: str | None = None
    context: str
    data_preview: Any
    float_ids: list[str] = []
    chart_data: dict | None = None
