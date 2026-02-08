from fastapi import APIRouter

router = APIRouter()

@router.get("/schema")
def schema():
    return {
        "tables": [
            "argo_metadata",
            "argo_embeddings",
            "profile_parquet_index"
        ]
    }
