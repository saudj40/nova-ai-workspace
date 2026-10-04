import os
from dataclasses import dataclass
from typing import Annotated

from fastapi import (
    Depends,
    HTTPException,
    status,
)
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)
from supabase import (
    Client,
    create_client,
)


bearer_scheme = HTTPBearer(
    auto_error=False
)


@dataclass
class AuthenticatedUser:
    id: str
    email: str | None = None


def _get_supabase_client() -> Client:
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

    return create_client(
        supabase_url,
        supabase_key,
    )


def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
) -> AuthenticatedUser:
    if credentials is None:
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail="Authentication required.",
        )

    if (
        credentials.scheme.lower()
        != "bearer"
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Invalid authentication scheme."
            ),
        )

    token = credentials.credentials.strip()

    if not token:
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail="Authentication required.",
        )

    try:
        supabase = (
            _get_supabase_client()
        )

        response = (
            supabase.auth.get_user(
                token
            )
        )

        user = response.user

    except Exception as error:
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Invalid or expired session."
            ),
        ) from error

    if not user:
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Invalid or expired session."
            ),
        )

    return AuthenticatedUser(
        id=str(user.id),
        email=user.email,
    )