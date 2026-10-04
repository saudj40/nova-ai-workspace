import logging
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Response,
    UploadFile,
    status,
)

from app.core.auth import (
    AuthenticatedUser,
    get_current_user,
)
from app.core.session import (
    get_scoped_conversation_id,
)
from app.services.documents import (
    document_service,
)
from app.services.rate_limit import (
    rate_limiter,
)


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/documents",
    tags=["documents"],
)


def get_conversation_scope(
    user_id: str,
    conversation_id: str,
) -> str:
    try:
        return get_scoped_conversation_id(
            session_id=user_id,
            conversation_id=conversation_id,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail="Invalid conversation.",
        ) from error


def enforce_upload_rate_limit(
    user_id: str,
) -> None:
    try:
        result = (
            rate_limiter.check_upload_limit(
                session_id=user_id
            )
        )

    except RuntimeError as error:
        logger.exception(
            "Upload rate-limit service failed."
        )

        raise HTTPException(
            status_code=503,
            detail=(
                "Nova's upload protection "
                "service is temporarily "
                "unavailable."
            ),
        ) from error

    if result.allowed:
        return

    retry_after = max(
        1,
        result.retry_after,
    )

    raise HTTPException(
        status_code=429,
        detail=(
            "Too many document uploads. "
            "Please wait before uploading "
            "another PDF."
        ),
        headers={
            "Retry-After":
                str(retry_after),
        },
    )


@router.post(
    "/upload",
    status_code=(
        status.HTTP_201_CREATED
    ),
)
async def upload_document(
    conversation_id: Annotated[
        str,
        Form(min_length=1),
    ],
    file: Annotated[
        UploadFile,
        File(),
    ],
    user: Annotated[
        AuthenticatedUser,
        Depends(get_current_user),
    ],
):
    enforce_upload_rate_limit(
        user_id=user.id
    )

    scoped_conversation_id = (
        get_conversation_scope(
            user_id=user.id,
            conversation_id=conversation_id,
        )
    )

    filename = (
        file.filename
        or "document.pdf"
    )

    content_type = (
        file.content_type
        or "application/pdf"
    )

    try:
        file_content = await file.read(
            document_service.MAX_FILE_SIZE + 1
        )

        if (
            len(file_content)
            >
            document_service.MAX_FILE_SIZE
        ):
            raise HTTPException(
                status_code=413,
                detail=(
                    "The PDF exceeds "
                    "the 15 MB limit."
                ),
            )

        return (
            document_service.save_document(
                user_id=user.id,

                conversation_id=(
                    scoped_conversation_id
                ),

                filename=filename,

                content_type=content_type,

                file_content=file_content,
            )
        )

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    except RuntimeError as error:
        logger.exception(
            "Document upload failed."
        )

        raise HTTPException(
            status_code=503,
            detail=(
                "Nova is temporarily unable "
                "to process this document."
            ),
        ) from error

    except Exception as error:
        logger.exception(
            "Unexpected document upload error."
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Nova encountered a temporary "
                "problem while processing "
                "this document."
            ),
        ) from error

    finally:
        await file.close()


@router.get(
    "/conversation/{conversation_id}"
)
def get_conversation_documents(
    conversation_id: str,
    user: Annotated[
        AuthenticatedUser,
        Depends(get_current_user),
    ],
):
    scoped_conversation_id = (
        get_conversation_scope(
            user_id=user.id,
            conversation_id=conversation_id,
        )
    )

    try:
        documents = (
            document_service.list_documents(
                user_id=user.id,

                conversation_id=(
                    scoped_conversation_id
                ),
            )
        )

        return {
            "documents":
                documents,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    except Exception as error:
        logger.exception(
            "Document listing failed."
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Could not load conversation "
                "documents."
            ),
        ) from error


@router.delete(
    "/conversation/{conversation_id}/"
    "{document_id}",
    status_code=(
        status.HTTP_204_NO_CONTENT
    ),
)
def delete_document(
    conversation_id: str,
    document_id: str,
    user: Annotated[
        AuthenticatedUser,
        Depends(get_current_user),
    ],
):
    scoped_conversation_id = (
        get_conversation_scope(
            user_id=user.id,
            conversation_id=conversation_id,
        )
    )

    try:
        was_deleted = (
            document_service.delete_document(
                user_id=user.id,

                conversation_id=(
                    scoped_conversation_id
                ),

                document_id=document_id,
            )
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    except RuntimeError as error:
        logger.exception(
            "Document deletion failed."
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Could not delete "
                "the document."
            ),
        ) from error

    except Exception as error:
        logger.exception(
            "Unexpected document "
            "deletion error."
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Could not delete "
                "the document."
            ),
        ) from error

    if not was_deleted:
        raise HTTPException(
            status_code=404,
            detail=(
                "Document was not found."
            ),
        )

    return Response(
        status_code=(
            status.HTTP_204_NO_CONTENT
        )
    )