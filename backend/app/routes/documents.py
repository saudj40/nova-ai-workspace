from typing import Annotated

from fastapi import (
    APIRouter,
    File,
    Form,
    HTTPException,
    Response,
    UploadFile,
    status,
)

from app.services.documents import (
    document_service,
)


router = APIRouter(
    prefix="/documents",
    tags=["documents"],
)


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
):
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
                conversation_id=conversation_id,
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

    finally:
        await file.close()


@router.get(
    "/conversation/{conversation_id}"
)
def get_conversation_documents(
    conversation_id: str,
):
    try:
        documents = (
            document_service.list_documents(
                conversation_id
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
):
    try:
        was_deleted = (
            document_service.delete_document(
                conversation_id=conversation_id,
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