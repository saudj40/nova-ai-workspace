from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.auth import (
    AuthenticatedUser,
    get_current_user,
)
from app.routes.chat import router as chat_router
from app.routes.demo import router as demo_router
from app.routes.documents import router as documents_router


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


app.include_router(chat_router)
app.include_router(documents_router)
app.include_router(demo_router)


@app.get("/")
def home():
    return {
        "message": "Welcome to Nova AI Workspace",
        "status": "online",
        "version": "0.4.0",
    }


@app.get("/auth/me")
def auth_me(
    user: AuthenticatedUser = Depends(
        get_current_user
    ),
):
    return {
        "id": user.id,
        "email": user.email,
    }
