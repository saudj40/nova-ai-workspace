from collections.abc import Generator

from app.core.config import AI_PROVIDER
from app.providers.base import AIProvider
from app.providers.hosted import HostedProvider
from app.providers.ollama import OllamaProvider


def create_provider() -> AIProvider:
    if AI_PROVIDER == "ollama":
        return OllamaProvider()

    if AI_PROVIDER == "hosted":
        return HostedProvider()

    raise RuntimeError(
        f"Unsupported AI_PROVIDER: "
        f"{AI_PROVIDER}"
    )


provider = create_provider()


def generate_response(
    message: str,
    conversation_id: str,
) -> str:
    return provider.generate(
        message=message,
        conversation_id=conversation_id,
    )


def stream_response(
    message: str,
    conversation_id: str,
) -> Generator[str, None, None]:
    return provider.generate_stream(
        message=message,
        conversation_id=conversation_id,
    )