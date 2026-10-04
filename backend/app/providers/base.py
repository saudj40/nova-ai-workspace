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
        user_id: str,
        message: str,
        conversation_id: str,
    ) -> list[dict]:
        document_context = (
            document_service.build_rag_context(
                user_id=user_id,
                query=message,
                conversation_id=conversation_id,
            )
        )

        return conversation_manager.build_messages(
            user_id=user_id,
            user_message=message,
            conversation_id=conversation_id,
            document_context=document_context,
        )

    @staticmethod
    def save_conversation(
        user_id: str,
        user_message: str,
        assistant_message: str,
        conversation_id: str,
    ) -> None:
        conversation_manager.save_user_message(
            user_id=user_id,
            message=user_message,
            conversation_id=conversation_id,
        )

        conversation_manager.save_assistant_message(
            user_id=user_id,
            message=assistant_message,
            conversation_id=conversation_id,
        )

    def generate_public_stream(
        self,
        messages: list[dict],
    ) -> Generator[str, None, None]:
        raise NotImplementedError

    @abstractmethod
    def generate(
        self,
        user_id: str,
        message: str,
        conversation_id: str,
    ) -> str:
        raise NotImplementedError

    @abstractmethod
    def generate_stream(
        self,
        user_id: str,
        message: str,
        conversation_id: str,
    ) -> Generator[str, None, None]:
        raise NotImplementedError