from typing import Annotated

from fastapi import (
    APIRouter,
    File,
    Form,
    Header,
    HTTPException,
    Response,
    UploadFile,
    status,
)

from app.core.session import (
    get_scoped_conversation_id,
)
from app.services.documents import (
    document_service,
)


router = APIRouter(
    prefix="/documents",
    tags=["documents"],
)


def get_conversation_scope(
    session_id: str,
    conversation_id: str,
) -> str:
    try:
        return get_scoped_conversation_id(
            session_id=session_id,
            conversation_id=conversation_id,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error


@router.post(
    "/upload",
    status_code=status.HTTP_201_CREATED,
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
    session_id: Annotated[
        str,
        Header(
            alias="X-Nova-Session",
            min_length=16,
            max_length=128,
        ),
    ],
):
    scoped_conversation_id = (
        get_conversation_scope(
            session_id=session_id,
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
        file_content = (
            await file.read()
        )

        return (
            document_service.save_document(
                conversation_id=(
                    scoped_conversation_id
                ),
                filename=filename,
                content_type=content_type,
                file_content=file_content,
            )
        )

    except ValueError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(error),
        ) from error

    except RuntimeError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=str(error),
        ) from error

    finally:
        await file.close()


@router.get(
    "/conversation/{conversation_id}"
)
def get_conversation_documents(
    conversation_id: str,
    session_id: Annotated[
        str,
        Header(
            alias="X-Nova-Session",
            min_length=16,
            max_length=128,
        ),
    ],
):
    scoped_conversation_id = (
        get_conversation_scope(
            session_id=session_id,
            conversation_id=conversation_id,
        )
    )

    try:
        documents = (
            document_service.list_documents(
                scoped_conversation_id
            )
        )

        return {
            "documents": documents,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(error),
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
    session_id: Annotated[
        str,
        Header(
            alias="X-Nova-Session",
            min_length=16,
            max_length=128,
        ),
    ],
):
    scoped_conversation_id = (
        get_conversation_scope(
            session_id=session_id,
            conversation_id=conversation_id,
        )
    )

    try:
        was_deleted = (
            document_service.delete_document(
                conversation_id=(
                    scoped_conversation_id
                ),
                document_id=document_id,
            )
        )

    except ValueError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(error),
        ) from error

    except RuntimeError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=str(error),
        ) from error

    if not was_deleted:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Document was not found."
            ),
        )

    return Response(
        status_code=(
            status.HTTP_204_NO_CONTENT
        )
    )