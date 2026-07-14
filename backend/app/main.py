from fastapi import FastAPI

from app.routes.chat import router as chat_router


app = FastAPI(
    title="Nova AI Workspace",
    description="Building a personal AI platform from scratch",
    version="0.2.0"
)


app.include_router(chat_router)


@app.get("/")
def home():
    return {
        "message": "Welcome to Nova AI Workspace 🚀"
    }