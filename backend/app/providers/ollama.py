import requests

from app.core.config import OLLAMA_HOST, OLLAMA_MODEL
from app.providers.base import AIProvider


class OllamaProvider(AIProvider):

    def generate(self, message: str) -> str:

        url = f"{OLLAMA_HOST}/api/generate"

        payload = {
            "model": OLLAMA_MODEL,
            "prompt": message,
            "stream": False
        }

        response = requests.post(
            url,
            json=payload,
            timeout=120
        )

        response.raise_for_status()

        data = response.json()

        return data["response"]