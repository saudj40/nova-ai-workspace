import json
from collections.abc import Generator

import requests

from app.core.config import OLLAMA_HOST, OLLAMA_MODEL
from app.providers.base import AIProvider
from app.conversation.manager import conversation_manager


class OllamaProvider(AIProvider):

    def generate(
        self,
        message: str,
        conversation_id: str,
    ) -> str:
        url = f"{OLLAMA_HOST}/api/chat"

        messages = conversation_manager.build_messages(
            user_message=message,
            conversation_id=conversation_id,
        )

        payload = {
            "model": OLLAMA_MODEL,
            "messages": messages,
            "stream": False,
            "keep_alive": "30m",
            "options": {
                "temperature": 0.6,
                "num_predict": 250,
            },
        }

        try:
            response = requests.post(
                url,
                json=payload,
                timeout=180,
            )

            response.raise_for_status()

        except requests.exceptions.Timeout as error:
            raise RuntimeError(
                "Ollama took too long to respond."
            ) from error

        except requests.exceptions.ConnectionError as error:
            raise RuntimeError(
                "Cannot connect to Ollama. Make sure Ollama is running."
            ) from error

        except requests.exceptions.RequestException as error:
            raise RuntimeError(
                f"Ollama request failed: {error}"
            ) from error

        data = response.json()

        assistant_response = (
            data.get("message", {})
            .get("content", "")
            .strip()
        )

        if not assistant_response:
            raise RuntimeError("Ollama returned an empty response.")

        conversation_manager.save_user_message(
            message=message,
            conversation_id=conversation_id,
        )

        conversation_manager.save_assistant_message(
            message=assistant_response,
            conversation_id=conversation_id,
        )

        return assistant_response

    def generate_stream(
        self,
        message: str,
        conversation_id: str,
    ) -> Generator[str, None, None]:
        url = f"{OLLAMA_HOST}/api/chat"

        messages = conversation_manager.build_messages(
            user_message=message,
            conversation_id=conversation_id,
        )

        payload = {
            "model": OLLAMA_MODEL,
            "messages": messages,
            "stream": True,
            "keep_alive": "30m",
            "options": {
                "temperature": 0.6,
                "num_predict": 250,
            },
        }

        full_response = ""

        try:
            with requests.post(
                url,
                json=payload,
                stream=True,
                timeout=(10, 180),
            ) as response:
                response.raise_for_status()

                for line in response.iter_lines():
                    if not line:
                        continue

                    data = json.loads(line.decode("utf-8"))

                    if data.get("error"):
                        raise RuntimeError(data["error"])

                    content = (
                        data.get("message", {})
                        .get("content", "")
                    )

                    if content:
                        full_response += content
                        yield content

                    if data.get("done"):
                        break

        except requests.exceptions.Timeout as error:
            raise RuntimeError(
                "Ollama streaming request timed out."
            ) from error

        except requests.exceptions.ConnectionError as error:
            raise RuntimeError(
                "Cannot connect to Ollama. Make sure Ollama is running."
            ) from error

        except requests.exceptions.RequestException as error:
            raise RuntimeError(
                f"Ollama streaming request failed: {error}"
            ) from error

        except json.JSONDecodeError as error:
            raise RuntimeError(
                "Ollama returned invalid streaming data."
            ) from error

        final_response = full_response.strip()

        if final_response:
            conversation_manager.save_user_message(
                message=message,
                conversation_id=conversation_id,
            )

            conversation_manager.save_assistant_message(
                message=final_response,
                conversation_id=conversation_id,
            )