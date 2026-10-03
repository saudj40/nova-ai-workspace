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

    UPLOAD_LIMIT = 3
    UPLOAD_WINDOW_SECONDS = 600

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

        self.client: Client = (
            create_client(
                supabase_url,
                supabase_key,
            )
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

    def _check_limit(
        self,
        session_id: str,
        bucket: str,
        limit: int,
        window_seconds: int,
    ) -> RateLimitResult:
        rate_key = (
            self._build_rate_key(
                session_id=session_id,
                bucket=bucket,
            )
        )

        try:
            response = self.client.rpc(
                "check_rate_limit",
                {
                    "p_rate_key":
                        rate_key,
                    "p_limit":
                        limit,
                    "p_window_seconds":
                        window_seconds,
                },
            ).execute()

        except Exception as error:
            logger.exception(
                "Rate-limit check failed "
                "for bucket=%s.",
                bucket,
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

    def check_chat_limit(
        self,
        session_id: str,
    ) -> RateLimitResult:
        return self._check_limit(
            session_id=session_id,
            bucket="chat",
            limit=self.CHAT_LIMIT,
            window_seconds=(
                self.CHAT_WINDOW_SECONDS
            ),
        )

    def check_upload_limit(
        self,
        session_id: str,
    ) -> RateLimitResult:
        return self._check_limit(
            session_id=session_id,
            bucket="upload",
            limit=self.UPLOAD_LIMIT,
            window_seconds=(
                self.UPLOAD_WINDOW_SECONDS
            ),
        )


rate_limiter = RateLimiter()