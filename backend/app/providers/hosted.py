import json
from collections.abc import Generator

import requests

from app.core.config import (
    AI_API_KEY,
    AI_BASE_URL,
    AI_MODEL,
)
from app.providers.base import AIProvider


class HostedProvider(AIProvider):

    def __init__(self) -> None:
        if not AI_API_KEY:
            raise RuntimeError(
                "AI_API_KEY is required when "
                "AI_PROVIDER=hosted."
            )

        if not AI_BASE_URL:
            raise RuntimeError(
                "AI_BASE_URL is required when "
                "AI_PROVIDER=hosted."
            )

        if not AI_MODEL:
            raise RuntimeError(
                "AI_MODEL is required when "
                "AI_PROVIDER=hosted."
            )

    @staticmethod
    def _headers() -> dict:
        return {
            "Authorization": (
                f"Bearer {AI_API_KEY}"
            ),
            "Content-Type": (
                "application/json"
            ),
        }

    @staticmethod
    def _url() -> str:
        return (
            f"{AI_BASE_URL.rstrip('/')}"
            "/chat/completions"
        )

    def generate(
        self,
        message: str,
        conversation_id: str,
    ) -> str:
        messages = self.build_messages(
            message=message,
            conversation_id=conversation_id,
        )

        payload = {
            "model": AI_MODEL,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 500,
            "stream": False,
        }

        try:
            response = requests.post(
                self._url(),
                headers=self._headers(),
                json=payload,
                timeout=120,
            )

            response.raise_for_status()

        except requests.exceptions.Timeout as error:
            raise RuntimeError(
                "AI provider took too long "
                "to respond."
            ) from error

        except requests.exceptions.ConnectionError as error:
            raise RuntimeError(
                "Cannot connect to the "
                "AI provider."
            ) from error

        except requests.exceptions.HTTPError as error:
            try:
                detail = response.json()
            except ValueError:
                detail = response.text

            raise RuntimeError(
                f"AI provider rejected the request: "
                f"{detail}"
            ) from error

        except requests.exceptions.RequestException as error:
            raise RuntimeError(
                "AI provider request failed."
            ) from error

        try:
            data = response.json()

        except requests.exceptions.JSONDecodeError as error:
            raise RuntimeError(
                "AI provider returned invalid JSON."
            ) from error

        try:
            assistant_response = (
                data["choices"][0]
                ["message"]
                ["content"]
                .strip()
            )

        except (
            KeyError,
            IndexError,
            TypeError,
            AttributeError,
        ) as error:
            raise RuntimeError(
                "AI provider returned an "
                "unexpected response."
            ) from error

        if not assistant_response:
            raise RuntimeError(
                "AI provider returned an "
                "empty response."
            )

        self.save_conversation(
            user_message=message,
            assistant_message=assistant_response,
            conversation_id=conversation_id,
        )

        return assistant_response

    def generate_stream(
        self,
        message: str,
        conversation_id: str,
    ) -> Generator[str, None, None]:
        messages = self.build_messages(
            message=message,
            conversation_id=conversation_id,
        )

        payload = {
            "model": AI_MODEL,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 500,
            "stream": True,
        }

        full_response = ""

        try:
            with requests.post(
                self._url(),
                headers=self._headers(),
                json=payload,
                stream=True,
                timeout=(10, 180),
            ) as response:
                response.raise_for_status()

                for raw_line in (
                    response.iter_lines()
                ):
                    if not raw_line:
                        continue

                    line = raw_line.decode(
                        "utf-8"
                    ).strip()

                    if not line.startswith(
                        "data:"
                    ):
                        continue

                    data_text = (
                        line[5:].strip()
                    )

                    if data_text == "[DONE]":
                        break

                    try:
                        data = json.loads(
                            data_text
                        )

                    except json.JSONDecodeError:
                        continue

                    choices = data.get(
                        "choices",
                        [],
                    )

                    if not choices:
                        continue

                    delta = (
                        choices[0]
                        .get("delta", {})
                    )

                    content = delta.get(
                        "content"
                    )

                    if content:
                        full_response += (
                            content
                        )

                        yield content

        except requests.exceptions.Timeout as error:
            raise RuntimeError(
                "AI provider streaming "
                "request timed out."
            ) from error

        except requests.exceptions.ConnectionError as error:
            raise RuntimeError(
                "Cannot connect to the "
                "AI provider."
            ) from error

        except requests.exceptions.HTTPError as error:
            try:
                detail = response.json()
            except ValueError:
                detail = response.text

            raise RuntimeError(
                f"AI provider rejected the request: "
                f"{detail}"
            ) from error

        except requests.exceptions.RequestException as error:
            raise RuntimeError(
                "AI provider streaming "
                "request failed."
            ) from error

        final_response = (
            full_response.strip()
        )

        if not final_response:
            return

        self.save_conversation(
            user_message=message,
            assistant_message=final_response,
            conversation_id=conversation_id,
        )