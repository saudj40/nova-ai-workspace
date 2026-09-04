from typing import Annotated

from fastapi import (
    APIRouter,
    Header,
    HTTPException,
    Response,
    status,
)
from fastapi.responses import (
    StreamingResponse,
)

from app.conversation.manager import (
    conversation_manager,
)
from app.core.session import (
    get_scoped_conversation_id,
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


def get_conversation_scope(
    session_id: str,
    conversation_id: str,
) -> str:
    try:
        return get_scoped_conversation_id(
            session_id=session_id,
            conversation_id=conversation_id,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error


@router.post(
    "/chat",
    response_model=ChatResponse,
)
def chat(
    request: ChatRequest,
    session_id: Annotated[
        str,
        Header(
            alias="X-Nova-Session",
            min_length=16,
            max_length=128,
        ),
    ],
):
    scoped_conversation_id = (
        get_conversation_scope(
            session_id=session_id,
            conversation_id=(
                request.conversation_id
            ),
        )
    )

    try:
        response = generate_response(
            message=request.message,
            conversation_id=(
                scoped_conversation_id
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
    session_id: Annotated[
        str,
        Header(
            alias="X-Nova-Session",
            min_length=16,
            max_length=128,
        ),
    ],
):
    scoped_conversation_id = (
        get_conversation_scope(
            session_id=session_id,
            conversation_id=(
                request.conversation_id
            ),
        )
    )

    return StreamingResponse(
        stream_response(
            message=request.message,
            conversation_id=(
                scoped_conversation_id
            ),
        ),
        media_type="text/plain",
        headers={
            "Cache-Control":
                "no-cache, no-store",
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
    session_id: Annotated[
        str,
        Header(
            alias="X-Nova-Session",
            min_length=16,
            max_length=128,
        ),
    ],
):
    scoped_conversation_id = (
        get_conversation_scope(
            session_id=session_id,
            conversation_id=conversation_id,
        )
    )

    conversation_manager.clear(
        scoped_conversation_id
    )

    document_service.delete_conversation_documents(
        scoped_conversation_id
    )

    return Response(
        status_code=(
            status.HTTP_204_NO_CONTENT
        )
    )