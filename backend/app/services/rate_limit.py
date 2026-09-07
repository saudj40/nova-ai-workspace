import hashlib
import logging
import os
from dataclasses import dataclass

from dotenv import load_dotenv
from supabase import Client, create_client


load_dotenv()

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class RateLimitResult:
    allowed: bool
    remaining: int
    retry_after: int


class RateLimiter:
    CHAT_LIMIT = 12
    CHAT_WINDOW_SECONDS = 60

    def __init__(self) -> None:
        supabase_url = os.getenv(
            "SUPABASE_URL"
        )
        supabase_key = os.getenv(
            "SUPABASE_SERVICE_ROLE_KEY"
        )

        if not supabase_url:
            raise RuntimeError(
                "SUPABASE_URL is not configured."
            )

        if not supabase_key:
            raise RuntimeError(
                "SUPABASE_SERVICE_ROLE_KEY "
                "is not configured."
            )

        self.client: Client = create_client(
            supabase_url,
            supabase_key,
        )

    @staticmethod
    def _build_rate_key(
        session_id: str,
        bucket: str,
    ) -> str:
        digest = hashlib.sha256(
            session_id.encode("utf-8")
        ).hexdigest()

        return f"{bucket}:{digest}"

    def check_chat_limit(
        self,
        session_id: str,
    ) -> RateLimitResult:
        rate_key = self._build_rate_key(
            session_id=session_id,
            bucket="chat",
        )

        try:
            response = self.client.rpc(
                "check_rate_limit",
                {
                    "p_rate_key": rate_key,
                    "p_limit": self.CHAT_LIMIT,
                    "p_window_seconds": (
                        self.CHAT_WINDOW_SECONDS
                    ),
                },
            ).execute()

        except Exception as error:
            logger.exception(
                "Rate-limit check failed."
            )
            raise RuntimeError(
                "Rate-limit service is "
                "temporarily unavailable."
            ) from error

        rows = response.data or []

        if not rows:
            raise RuntimeError(
                "Rate-limit service returned "
                "an invalid response."
            )

        row = rows[0]

        try:
            return RateLimitResult(
                allowed=bool(
                    row["allowed"]
                ),
                remaining=max(
                    0,
                    int(
                        row.get(
                            "remaining",
                            0,
                        )
                    ),
                ),
                retry_after=max(
                    0,
                    int(
                        row.get(
                            "retry_after",
                            0,
                        )
                    ),
                ),
            )

        except (
            KeyError,
            TypeError,
            ValueError,
        ) as error:
            raise RuntimeError(
                "Rate-limit service returned "
                "an invalid response."
            ) from error


rate_limiter = RateLimiter()
