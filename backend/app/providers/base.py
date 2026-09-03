from abc import ABC, abstractmethod
from collections.abc import Generator

from app.conversation.manager import (
    conversation_manager,
)
from app.services.documents import (
    document_service,
)


class AIProvider(ABC):

    @staticmethod
    def build_messages(
        message: str,
        conversation_id: str,
    ) -> list[dict]:
        document_context = (
            document_service.build_rag_context(
                query=message,
                conversation_id=conversation_id,
            )
        )

        return conversation_manager.build_messages(
            user_message=message,
            conversation_id=conversation_id,
            document_context=document_context,
        )

    @staticmethod
    def save_conversation(
        user_message: str,
        assistant_message: str,
        conversation_id: str,
    ) -> None:
        conversation_manager.save_user_message(
            message=user_message,
            conversation_id=conversation_id,
        )

        conversation_manager.save_assistant_message(
            message=assistant_message,
            conversation_id=conversation_id,
        )

    @abstractmethod
    def generate(
        self,
        message: str,
        conversation_id: str,
    ) -> str:
        raise NotImplementedError

    @abstractmethod
    def generate_stream(
        self,
        message: str,
        conversation_id: str,
    ) -> Generator[str, None, None]:
        raise NotImplementedError