from fastapi import APIRouter

from app.schemas.chat import ChatRequest, ChatResponse
from app.services.nova import generate_response


router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):

    response = generate_response(request.message)

    return {
        "response": response
    }