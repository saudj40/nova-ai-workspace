from collections.abc import Generator

from app.providers.ollama import OllamaProvider


provider = OllamaProvider()


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