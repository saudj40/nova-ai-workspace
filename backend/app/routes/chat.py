import logging
from collections.abc import Generator
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
from app.services.rate_limit import (
    rate_limiter,
)


logger = logging.getLogger(__name__)

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
            detail="Invalid conversation.",
        ) from error


def enforce_chat_rate_limit(
    session_id: str,
) -> None:
    try:
        result = (
            rate_limiter.check_chat_limit(
                session_id=session_id
            )
        )

    except RuntimeError as error:
        logger.exception(
            "Chat rate-limit service failed."
        )

        raise HTTPException(
            status_code=503,
            detail=(
                "Nova's request protection "
                "service is temporarily "
                "unavailable."
            ),
        ) from error

    if result.allowed:
        return

    retry_after = max(
        1,
        result.retry_after,
    )

    raise HTTPException(
        status_code=429,
        detail=(
            "Too many requests. "
            "Please wait a moment "
            "before trying again."
        ),
        headers={
            "Retry-After":
                str(retry_after),
        },
    )


def safe_stream_response(
    message: str,
    conversation_id: str,
) -> Generator[str, None, None]:
    try:
        yield from stream_response(
            message=message,
            conversation_id=conversation_id,
        )

    except RuntimeError:
        logger.exception(
            "Nova streaming generation failed."
        )

        yield (
            "\n\n"
            "*Nova is temporarily unable to "
            "complete this response. Please "
            "try again in a moment.*"
        )

    except Exception:
        logger.exception(
            "Unexpected Nova streaming error."
        )

        yield (
            "\n\n"
            "*Nova encountered a temporary "
            "problem while generating this "
            "response. Please try again.*"
        )


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
    enforce_chat_rate_limit(
        session_id=session_id
    )

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
        logger.exception(
            "Nova generation failed."
        )

        raise HTTPException(
            status_code=503,
            detail=(
                "Nova is temporarily unable "
                "to generate a response."
            ),
        ) from error

    except Exception as error:
        logger.exception(
            "Unexpected Nova generation error."
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Nova encountered a temporary "
                "server problem."
            ),
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
    enforce_chat_rate_limit(
        session_id=session_id
    )

    scoped_conversation_id = (
        get_conversation_scope(
            session_id=session_id,
            conversation_id=(
                request.conversation_id
            ),
        )
    )

    return StreamingResponse(
        safe_stream_response(
            message=request.message,
            conversation_id=(
                scoped_conversation_id
            ),
        ),
        media_type=(
            "text/plain; charset=utf-8"
        ),
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

    try:
        conversation_manager.clear(
            scoped_conversation_id
        )

        document_service.delete_conversation_documents(
            scoped_conversation_id
        )

    except Exception as error:
        logger.exception(
            "Conversation deletion failed."
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Could not delete the "
                "conversation."
            ),
        ) from error

    return Response(
        status_code=(
            status.HTTP_204_NO_CONTENT
        )
    )