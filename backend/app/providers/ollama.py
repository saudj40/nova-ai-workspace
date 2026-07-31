import requests

from app.core.config import OLLAMA_HOST, OLLAMA_MODEL
from app.providers.base import AIProvider
from app.prompts.system_prompt import SYSTEM_PROMPT


class OllamaProvider(AIProvider):

    def generate(self, message: str) -> str:

        url = f"{OLLAMA_HOST}/api/chat"

        payload = {
            "model": OLLAMA_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": message
                }
            ],
            "stream": False
        }

        response = requests.post(
            url,
            json=payload,
            timeout=120
        )

        response.raise_for_status()

        data = response.json()

        return data["message"]["content"]