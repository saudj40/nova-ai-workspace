from fastapi import FastAPI

from app.core.config import APP_NAME, APP_VERSION
from app.routes.chat import router as chat_router


app = FastAPI(
    title=APP_NAME,
    description="Building a personal AI platform from scratch",
    version=APP_VERSION
)


app.include_router(chat_router)


@app.get("/")
def home():
    return {
        "message": "Welcome to Nova AI Workspace 🚀"
    }