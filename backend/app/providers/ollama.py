import requests

from app.core.config import OLLAMA_HOST, OLLAMA_MODEL
from app.providers.base import AIProvider
from app.conversation.manager import conversation_manager


class OllamaProvider(AIProvider):

    def generate(self, message: str) -> str:

        url = f"{OLLAMA_HOST}/api/chat"

        messages = conversation_manager.build_messages(message)

        payload = {
            "model": OLLAMA_MODEL,
            "messages": messages,
            "stream": False
        }

        response = requests.post(
            url,
            json=payload,
            timeout=120
        )

        response.raise_for_status()

        data = response.json()

        assistant_response = data["message"]["content"]

        conversation_manager.save_user_message(message)
        conversation_manager.save_assistant_message(assistant_response)

        return assistant_response