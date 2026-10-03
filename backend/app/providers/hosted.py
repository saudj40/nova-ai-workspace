import json
import logging
from collections.abc import Generator

import requests

from app.core.config import (
    AI_API_KEY,
    AI_BASE_URL,
)
from app.providers.base import AIProvider


logger = logging.getLogger(__name__)


MAX_OUTPUT_TOKENS = 4096

PRIMARY_MODEL = (
    "nvidia/nemotron-3-ultra-550b-a55b:free"
)

FALLBACK_MODEL = "openrouter/free"

REQUEST_TIMEOUT = (15, 300)


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

    @staticmethod
    def _headers() -> dict:
        return {
            "Authorization":
                f"Bearer {AI_API_KEY}",
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

    @staticmethod
    def _models() -> tuple[str, ...]:
        return (
            PRIMARY_MODEL,
            FALLBACK_MODEL,
        )

    @staticmethod
    def _safe_error_detail(
        response: requests.Response,
    ) -> str:
        try:
            data = response.json()

            if isinstance(data, dict):
                error = data.get("error")

                if isinstance(error, dict):
                    message = error.get(
                        "message"
                    )

                    if message:
                        return str(message)

                if isinstance(error, str):
                    return error

        except ValueError:
            pass

        return (
            f"HTTP {response.status_code}"
        )

    def _build_payload(
        self,
        model: str,
        messages: list,
        stream: bool,
    ) -> dict:
        return {
            "model": model,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens":
                MAX_OUTPUT_TOKENS,
            "stream": stream,
        }

    def _request_non_streaming(
        self,
        model: str,
        messages: list,
    ) -> tuple[str, str | None]:
        payload = self._build_payload(
            model=model,
            messages=messages,
            stream=False,
        )

        logger.info(
            "Trying hosted model: %s",
            model,
        )

        try:
            response = requests.post(
                self._url(),
                headers=self._headers(),
                json=payload,
                timeout=REQUEST_TIMEOUT,
            )

            response.raise_for_status()

        except requests.exceptions.Timeout as error:
            raise RuntimeError(
                f"Model {model} timed out."
            ) from error

        except requests.exceptions.ConnectionError as error:
            raise RuntimeError(
                f"Could not connect while "
                f"using model {model}."
            ) from error

        except requests.exceptions.HTTPError as error:
            detail = (
                self._safe_error_detail(
                    response
                )
            )

            raise RuntimeError(
                f"Model {model} returned "
                f"{response.status_code}: "
                f"{detail}"
            ) from error

        except requests.exceptions.RequestException as error:
            raise RuntimeError(
                f"Request failed for "
                f"model {model}."
            ) from error

        try:
            data = response.json()

        except requests.exceptions.JSONDecodeError as error:
            raise RuntimeError(
                f"Model {model} returned "
                "invalid JSON."
            ) from error

        provider_error = (
            self._extract_provider_error(
                data
            )
        )

        if provider_error:
            raise RuntimeError(
                f"Model {model} returned "
                f"an error: "
                f"{provider_error}"
            )

        try:
            choice = data["choices"][0]

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
                f"Model {model} returned "
                "an unexpected response."
            ) from error

        if not assistant_response:
            raise RuntimeError(
                f"Model {model} returned "
                "an empty response."
            )

        return (
            assistant_response,
            finish_reason,
        )

    def generate(
        self,
        message: str,
        conversation_id: str,
    ) -> str:
        messages = self.build_messages(
            message=message,
            conversation_id=(
                conversation_id
            ),
        )

        last_error = None

        for model in self._models():
            try:
                (
                    assistant_response,
                    finish_reason,
                ) = self._request_non_streaming(
                    model=model,
                    messages=messages,
                )

                logger.info(
                    "Hosted generation "
                    "succeeded with model=%s",
                    model,
                )

                if (
                    finish_reason
                    == "length"
                ):
                    assistant_response += (
                        "\n\n"
                        "*Response reached the "
                        "maximum output length.*"
                    )

                    logger.warning(
                        "Hosted generation hit "
                        "the output token limit. "
                        "model=%s",
                        model,
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

            except RuntimeError as error:
                last_error = error

                logger.warning(
                    "Hosted model failed. "
                    "model=%s error=%s",
                    model,
                    error,
                )

        logger.error(
            "All hosted models failed."
        )

        raise RuntimeError(
            "All available AI models "
            "are temporarily unavailable."
        ) from last_error

    def _stream_model(
        self,
        model: str,
        messages: list,
    ) -> Generator[
        tuple[str, str | None, bool],
        None,
        None,
    ]:
        payload = self._build_payload(
            model=model,
            messages=messages,
            stream=True,
        )

        logger.info(
            "Trying hosted streaming "
            "model: %s",
            model,
        )

        full_response = ""
        finish_reason = None
        received_done = False

        try:
            with requests.post(
                self._url(),
                headers=self._headers(),
                json=payload,
                stream=True,
                timeout=REQUEST_TIMEOUT,
            ) as response:

                response.raise_for_status()

                for raw_line in (
                    response.iter_lines(
                        chunk_size=64,
                        decode_unicode=False,
                    )
                ):
                    if not raw_line:
                        continue

                    try:
                        line = (
                            raw_line.decode(
                                "utf-8"
                            ).strip()
                        )

                    except UnicodeDecodeError:
                        logger.warning(
                            "Skipped non-UTF-8 "
                            "OpenRouter SSE data. "
                            "model=%s",
                            model,
                        )

                        continue

                    if not line.startswith(
                        "data:"
                    ):
                        continue

                    data_text = (
                        line[5:].strip()
                    )

                    if (
                        data_text
                        == "[DONE]"
                    ):
                        received_done = True
                        break

                    try:
                        data = json.loads(
                            data_text
                        )

                    except json.JSONDecodeError:
                        logger.warning(
                            "Skipped invalid "
                            "OpenRouter SSE data. "
                            "model=%s",
                            model,
                        )

                        continue

                    provider_error = (
                        self._extract_provider_error(
                            data
                        )
                    )

                    if provider_error:
                        raise RuntimeError(
                            f"Model {model} "
                            "returned an error: "
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

                        yield (
                            content,
                            finish_reason,
                            received_done,
                        )

        except requests.exceptions.Timeout as error:
            raise RuntimeError(
                f"Streaming model {model} "
                "timed out."
            ) from error

        except requests.exceptions.ConnectionError as error:
            raise RuntimeError(
                f"Connection failed for "
                f"streaming model {model}."
            ) from error

        except requests.exceptions.HTTPError as error:
            detail = (
                self._safe_error_detail(
                    response
                )
            )

            raise RuntimeError(
                f"Streaming model {model} "
                f"returned "
                f"{response.status_code}: "
                f"{detail}"
            ) from error

        except requests.exceptions.RequestException as error:
            raise RuntimeError(
                f"Streaming request failed "
                f"for model {model}."
            ) from error

        final_response = (
            full_response.strip()
        )

        if not final_response:
            raise RuntimeError(
                f"Streaming model {model} "
                "returned an empty response."
            )

        yield (
            "",
            finish_reason,
            received_done,
        )

    def generate_stream(
        self,
        message: str,
        conversation_id: str,
    ) -> Generator[
        str,
        None,
        None,
    ]:
        messages = self.build_messages(
            message=message,
            conversation_id=(
                conversation_id
            ),
        )

        last_error = None

        for model in self._models():
            full_response = ""
            finish_reason = None
            received_done = False

            try:
                for (
                    content,
                    current_finish_reason,
                    current_received_done,
                ) in self._stream_model(
                    model=model,
                    messages=messages,
                ):
                    if current_finish_reason:
                        finish_reason = (
                            current_finish_reason
                        )

                    if current_received_done:
                        received_done = True

                    if content:
                        full_response += (
                            content
                        )

                        yield content

                final_response = (
                    full_response.strip()
                )

                if not final_response:
                    raise RuntimeError(
                        f"Model {model} "
                        "returned no text."
                    )

                if (
                    finish_reason
                    == "length"
                ):
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
                        "Hosted streaming "
                        "response hit the "
                        "output token limit. "
                        "model=%s",
                        model,
                    )

                elif (
                    not received_done
                    and finish_reason
                    is None
                ):
                    logger.warning(
                        "Hosted stream ended "
                        "without [DONE] or a "
                        "finish reason. "
                        "model=%s",
                        model,
                    )

                logger.info(
                    "Hosted stream completed. "
                    "model=%s "
                    "finish_reason=%s "
                    "received_done=%s "
                    "characters=%s",
                    model,
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

                return

            except RuntimeError as error:
                last_error = error

                if full_response:
                    logger.exception(
                        "Hosted stream failed "
                        "after output started. "
                        "model=%s",
                        model,
                    )

                    warning = (
                        "\n\n"
                        "*The AI connection "
                        "ended unexpectedly. "
                        "Please ask Nova "
                        "to continue.*"
                    )

                    full_response += warning
                    yield warning

                    self.save_conversation(
                        user_message=message,
                        assistant_message=(
                            full_response.strip()
                        ),
                        conversation_id=(
                            conversation_id
                        ),
                    )

                    return

                logger.warning(
                    "Hosted streaming model "
                    "failed before output. "
                    "Trying fallback. "
                    "model=%s error=%s",
                    model,
                    error,
                )

        logger.error(
            "All hosted streaming "
            "models failed."
        )

        raise RuntimeError(
            "All available AI models "
            "are temporarily unavailable."
        ) from last_error