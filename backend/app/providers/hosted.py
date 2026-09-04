import json
import logging
from collections.abc import Generator

import requests

from app.core.config import (
    AI_API_KEY,
    AI_BASE_URL,
    AI_MODEL,
)
from app.providers.base import AIProvider


logger = logging.getLogger(__name__)

MAX_OUTPUT_TOKENS = 4096


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
            "Content-Type":
                "application/json",
        }

    @staticmethod
    def _url() -> str:
        return (
            f"{AI_BASE_URL.rstrip('/')}"
            "/chat/completions"
        )

    @staticmethod
    def _extract_provider_error(
        data: dict,
    ) -> str | None:
        error = data.get("error")

        if not error:
            return None

        if isinstance(error, str):
            return error

        if isinstance(error, dict):
            return (
                error.get("message")
                or str(error)
            )

        return str(error)

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
            "max_tokens":
                MAX_OUTPUT_TOKENS,
            "stream": False,
        }

        try:
            response = requests.post(
                self._url(),
                headers=self._headers(),
                json=payload,
                timeout=(15, 300),
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
                "AI provider rejected "
                f"the request: {detail}"
            ) from error

        except requests.exceptions.RequestException as error:
            raise RuntimeError(
                "AI provider request failed."
            ) from error

        try:
            data = response.json()

        except requests.exceptions.JSONDecodeError as error:
            raise RuntimeError(
                "AI provider returned "
                "invalid JSON."
            ) from error

        provider_error = (
            self._extract_provider_error(
                data
            )
        )

        if provider_error:
            raise RuntimeError(
                f"AI provider error: "
                f"{provider_error}"
            )

        try:
            choice = (
                data["choices"][0]
            )

            assistant_response = (
                choice["message"]
                ["content"]
                .strip()
            )

            finish_reason = (
                choice.get(
                    "finish_reason"
                )
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

        if finish_reason == "length":
            assistant_response += (
                "\n\n"
                "*Response reached the "
                "maximum output length.*"
            )

            logger.warning(
                "Hosted generation hit "
                "the output token limit."
            )

        self.save_conversation(
            user_message=message,
            assistant_message=(
                assistant_response
            ),
            conversation_id=(
                conversation_id
            ),
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
            "max_tokens":
                MAX_OUTPUT_TOKENS,
            "stream": True,
        }

        full_response = ""
        finish_reason = None
        received_done = False

        try:
            with requests.post(
                self._url(),
                headers=self._headers(),
                json=payload,
                stream=True,
                timeout=(15, 300),
            ) as response:

                response.raise_for_status()

                for line in response.iter_lines(
                    chunk_size=64,
                    decode_unicode=True,
                ):
                    if not line:
                        continue

                    line = line.strip()

                    if not line.startswith(
                        "data:"
                    ):
                        continue

                    data_text = (
                        line[5:].strip()
                    )

                    if data_text == "[DONE]":
                        received_done = True
                        break

                    try:
                        data = json.loads(
                            data_text
                        )

                    except json.JSONDecodeError:
                        logger.warning(
                            "Skipped invalid "
                            "OpenRouter SSE data."
                        )

                        continue

                    provider_error = (
                        self._extract_provider_error(
                            data
                        )
                    )

                    if provider_error:
                        raise RuntimeError(
                            "AI provider error: "
                            f"{provider_error}"
                        )

                    choices = data.get(
                        "choices",
                        [],
                    )

                    if not choices:
                        continue

                    choice = choices[0]

                    current_finish_reason = (
                        choice.get(
                            "finish_reason"
                        )
                    )

                    if current_finish_reason:
                        finish_reason = (
                            current_finish_reason
                        )

                    delta = choice.get(
                        "delta",
                        {},
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
            logger.exception(
                "Hosted stream timed out."
            )

            if full_response:
                warning = (
                    "\n\n"
                    "*The connection to the AI "
                    "provider was interrupted. "
                    "Please ask Nova to continue.*"
                )

                full_response += warning
                yield warning

            else:
                raise RuntimeError(
                    "AI provider streaming "
                    "request timed out."
                ) from error

        except requests.exceptions.ConnectionError as error:
            logger.exception(
                "Hosted provider connection "
                "was interrupted."
            )

            if full_response:
                warning = (
                    "\n\n"
                    "*The connection to the AI "
                    "provider was interrupted. "
                    "Please ask Nova to continue.*"
                )

                full_response += warning
                yield warning

            else:
                raise RuntimeError(
                    "Cannot connect to the "
                    "AI provider."
                ) from error

        except requests.exceptions.HTTPError as error:
            try:
                detail = response.json()
            except ValueError:
                detail = response.text

            logger.exception(
                "Hosted provider HTTP error."
            )

            raise RuntimeError(
                "AI provider rejected "
                f"the request: {detail}"
            ) from error

        except requests.exceptions.RequestException as error:
            logger.exception(
                "Hosted provider request "
                "failed."
            )

            if full_response:
                warning = (
                    "\n\n"
                    "*The AI connection ended "
                    "unexpectedly. Please ask "
                    "Nova to continue.*"
                )

                full_response += warning
                yield warning

            else:
                raise RuntimeError(
                    "AI provider streaming "
                    "request failed."
                ) from error

        except RuntimeError as error:
            logger.exception(
                "Hosted provider returned "
                "a streaming error."
            )

            if full_response:
                warning = (
                    "\n\n"
                    "*The AI provider ended this "
                    "response unexpectedly. "
                    "Please ask Nova to continue.*"
                )

                full_response += warning
                yield warning

            else:
                raise error

        final_response = (
            full_response.strip()
        )

        if not final_response:
            return

        if finish_reason == "length":
            warning = (
                "\n\n"
                "*Response reached the "
                "maximum output length.*"
            )

            full_response += warning
            yield warning

            final_response = (
                full_response.strip()
            )

            logger.warning(
                "Hosted streaming response "
                "hit the output token limit."
            )

        elif (
            not received_done
            and finish_reason is None
        ):
            warning = (
                "\n\n"
                "*The AI stream ended "
                "unexpectedly. Please ask "
                "Nova to continue.*"
            )

            full_response += warning
            yield warning

            final_response = (
                full_response.strip()
            )

            logger.warning(
                "Hosted stream ended without "
                "[DONE] or a finish reason."
            )

        logger.info(
            "Hosted stream completed. "
            "finish_reason=%s "
            "received_done=%s "
            "characters=%s",
            finish_reason,
            received_done,
            len(final_response),
        )

        self.save_conversation(
            user_message=message,
            assistant_message=(
                final_response
            ),
            conversation_id=(
                conversation_id
            ),
        )