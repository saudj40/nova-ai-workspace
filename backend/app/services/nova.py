from collections.abc import Generator

from app.providers.ollama import OllamaProvider


provider = OllamaProvider()


def generate_response(message: str) -> str:
    return provider.generate(message)


def stream_response(message: str) -> Generator[str, None, None]:
    return provider.generate_stream(message)