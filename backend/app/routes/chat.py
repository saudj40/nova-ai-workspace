from fastapi import (
    APIRouter,
    HTTPException,
    Response,
    status,
)
from fastapi.responses import StreamingResponse

from app.conversation.manager import (
    conversation_manager,
)
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
)
from app.services.documents import (
    document_service,
)
from app.services.nova import (
    generate_response,
    stream_response,
)


router = APIRouter()


@router.post(
    "/chat",
    response_model=ChatResponse,
)
def chat(
    request: ChatRequest,
):
    try:
        response = generate_response(
            message=request.message,
            conversation_id=(
                request.conversation_id
            ),
        )

        return {
            "response": response,
        }

    except RuntimeError as error:
        raise HTTPException(
            status_code=503,
            detail=str(error),
        ) from error


@router.post(
    "/chat/stream"
)
def chat_stream(
    request: ChatRequest,
):
    return StreamingResponse(
        stream_response(
            message=request.message,
            conversation_id=(
                request.conversation_id
            ),
        ),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.delete(
    "/conversations/{conversation_id}",
    status_code=(
        status.HTTP_204_NO_CONTENT
    ),
)
def delete_conversation(
    conversation_id: str,
):
    conversation_manager.clear(
        conversation_id
    )

    document_service.delete_conversation_documents(
        conversation_id
    )

    return Response(
        status_code=(
            status.HTTP_204_NO_CONTENT
        )
    )