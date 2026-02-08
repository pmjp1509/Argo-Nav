from fastapi import APIRouter, HTTPException
from app.models.request import AskRequest
from typing import List, Dict
from app.services.sql_executor import execute_sql

router = APIRouter()



@router.get("/floats")
def list_floats():
    """Return a list of all floats for frontend map display."""
    try:
        sql = "SELECT float_id, latitude, longitude FROM argo_metadata;"
        rows = execute_sql(sql)
        return rows
    except Exception as e:
        # Fallback mock data for testing when DB is unavailable
        print(f"Error fetching floats: {e}")
