from fastapi import FastAPI
from fastapi.middleware.cors import (
    CORSMiddleware,
)

from app.routes.chat import (
    router as chat_router,
)
from app.routes.documents import (
    router as documents_router,
)


app = FastAPI(
    title="Nova AI Workspace",
    description=(
        "A personal AI workspace powered "
        "by FastAPI and Ollama"
    ),
    version="0.3.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(chat_router)
app.include_router(documents_router)


@app.get("/")
def home():
    return {
        "message": (
            "Welcome to Nova AI Workspace 🚀"
        ),
        "status": "online",
        "version": "0.3.0",
    }