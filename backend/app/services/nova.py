from app.providers.ollama import OllamaProvider


provider = OllamaProvider()


def generate_response(message: str) -> str:
    return provider.generate(message)