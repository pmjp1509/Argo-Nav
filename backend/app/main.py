import multiprocessing

if __name__ == "__main__":
    # This helps Windows handle process spawning more cleanly
    multiprocessing.freeze_support()
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import router
from app.core.startup import startup_event

app = FastAPI(title="ARGO Float AI", version="1.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await startup_event()

app.include_router(router, prefix="/api/v1")

