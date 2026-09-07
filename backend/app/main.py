import traceback

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


startup_error = None
chat_router = None
documents_router = None

try:
    from app.routes.chat import router as chat_router
    from app.routes.documents import router as documents_router

except Exception as error:
    startup_error = {
        "type": type(error).__name__,
        "message": str(error),
        "traceback": traceback.format_exc(),
    }


app = FastAPI(
    title="Nova AI Workspace",
    description="Nova AI Workspace backend",
    version="0.4.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://nova-ai-gsxq.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


if startup_error is None:
    app.include_router(chat_router)
    app.include_router(documents_router)


@app.get("/")
def home():
    if startup_error:
        return {
            "status": "startup_failed",
            "error": startup_error,
        }

    return {
        "message": "Welcome to Nova AI Workspace",
        "status": "online",
        "version": "0.4.0",
    }