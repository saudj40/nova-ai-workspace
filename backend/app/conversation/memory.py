import os

from dotenv import load_dotenv
from supabase import (
    Client,
    create_client,
)


load_dotenv()


class ConversationMemory:
    """
    Stores Nova conversation history persistently
    in Supabase.

    Every message is scoped by both:
    - authenticated user_id
    - conversation_id
    """

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


    def get_messages(
        self,
        user_id: str,
        conversation_id: str,
    ) -> list[dict[str, str]]:
        response = (
            self.client
            .table(
                "conversation_messages"
            )
            .select(
                "role, content"
            )
            .eq(
                "user_id",
                user_id,
            )
            .eq(
                "conversation_id",
                conversation_id,
            )
            .order("id")
            .execute()
        )

        rows = response.data or []

        return [
            {
                "role": row["role"],
                "content": row["content"],
            }
            for row in rows
        ]


    def add_message(
        self,
        user_id: str,
        role: str,
        content: str,
        conversation_id: str,
    ) -> None:
        allowed_roles = {
            "user",
            "assistant",
            "system",
        }

        if role not in allowed_roles:
            raise ValueError(
                "Unsupported conversation role: "
                f"{role}"
            )

        cleaned_content = (
            content.strip()
        )

        if not cleaned_content:
            return

        (
            self.client
            .table(
                "conversation_messages"
            )
            .insert(
                {
                    "user_id":
                        user_id,

                    "conversation_id":
                        conversation_id,

                    "role":
                        role,

                    "content":
                        cleaned_content,
                }
            )
            .execute()
        )


    def clear(
        self,
        user_id: str,
        conversation_id: str,
    ) -> None:
        (
            self.client
            .table(
                "conversation_messages"
            )
            .delete()
            .eq(
                "user_id",
                user_id,
            )
            .eq(
                "conversation_id",
                conversation_id,
            )
            .execute()
        )


    def delete_conversation(
        self,
        user_id: str,
        conversation_id: str,
    ) -> None:
        self.clear(
            user_id=user_id,
            conversation_id=conversation_id,
        )


    def clear_all_for_user(
        self,
        user_id: str,
    ) -> None:
        (
            self.client
            .table(
                "conversation_messages"
            )
            .delete()
            .eq(
                "user_id",
                user_id,
            )
            .execute()
        )


memory = ConversationMemory()