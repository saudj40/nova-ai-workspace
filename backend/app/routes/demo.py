import logging
from collections.abc import Generator

from fastapi import (
    APIRouter,
    HTTPException,
    Request,
)
from fastapi.responses import StreamingResponse

from app.schemas.chat import DemoChatRequest
from app.services.demo import stream_demo_response
from app.services.rate_limit import rate_limiter


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/demo",
    tags=["demo"],
)


def _client_rate_key(
    request: Request,
) -> str:
    forwarded_for = request.headers.get(
        "x-forwarded-for",
        "",
    )

    if forwarded_for:
        client_ip = (
            forwarded_for
            .split(",")[0]
            .strip()
        )
    elif request.headers.get(
        "x-real-ip"
    ):
        client_ip = request.headers[
            "x-real-ip"
        ].strip()
    elif request.client:
        client_ip = request.client.host
    else:
        client_ip = "unknown"

    return client_ip or "unknown"


def _enforce_demo_rate_limit(
    request: Request,
) -> None:
    # Local development should not consume the public demo quota.
    # Production requests still use the strict IP-based limiter below.
    request_host = (
        request.url.hostname or ""
    ).lower()

    if request_host in {
        "localhost",
        "127.0.0.1",
        "::1",
    }:
        return

    try:
        result = (
            rate_limiter.check_demo_limit(
                session_id=_client_rate_key(
                    request
                )
            )
        )

    except RuntimeError as error:
        logger.exception(
            "Demo rate-limit service failed."
        )

        raise HTTPException(
            status_code=503,
            detail=(
                "Nova's demo protection "
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
            "Demo limit reached. "
            "Please wait before trying again."
        ),
        headers={
            "Retry-After":
                str(retry_after),
        },
    )


def _safe_demo_stream(
    request: DemoChatRequest,
) -> Generator[str, None, None]:
    context = [
        item.model_dump()
        for item in request.context
    ]

    try:
        yield from stream_demo_response(
            message=request.message,
            context=context,
        )

    except RuntimeError:
        logger.exception(
            "Nova public demo generation "
            "failed."
        )

        yield (
            "\n\n"
            "Nova is temporarily unable to "
            "answer in the public demo. "
            "Please try again in a moment."
        )

    except Exception:
        logger.exception(
            "Unexpected Nova public demo "
            "generation error."
        )

        yield (
            "\n\n"
            "Nova encountered a temporary "
            "problem in the public demo. "
            "Please try again."
        )


@router.post("/chat/stream")
def demo_chat_stream(
    payload: DemoChatRequest,
    request: Request,
):
    _enforce_demo_rate_limit(
        request=request
    )

    return StreamingResponse(
        _safe_demo_stream(
            request=payload
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
