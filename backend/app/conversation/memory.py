import os
from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

class ConversationMemory:
    """
    Stores Nova conversation history persistently in Supabase.

    Each conversation is isolated using its conversation_id.
    """

    def __init__(self) -> None:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not supabase_url:
            raise RuntimeError("SUPABASE_URL is not configured.")

        if not supabase_key:
            raise RuntimeError(
                "SUPABASE_SERVICE_ROLE_KEY is not configured."
            )

        self.client: Client = create_client(
            supabase_url,
            supabase_key,
        )

    def get_messages(
        self,
        conversation_id: str = "default",
    ) -> list[dict[str, str]]:
        response = (
            self.client
            .table("conversation_messages")
            .select("role, content")
            .eq("conversation_id", conversation_id)
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
        role: str,
        content: str,
        conversation_id: str = "default",
    ) -> None:
        allowed_roles = {
            "user",
            "assistant",
            "system",
        }

        if role not in allowed_roles:
            raise ValueError(
                f"Unsupported conversation role: {role}"
            )

        cleaned_content = content.strip()

        if not cleaned_content:
            return

        (
            self.client
            .table("conversation_messages")
            .insert(
                {
                    "conversation_id": conversation_id,
                    "role": role,
                    "content": cleaned_content,
                }
            )
            .execute()
        )

    def clear(
        self,
        conversation_id: str = "default",
    ) -> None:
        (
            self.client
            .table("conversation_messages")
            .delete()
            .eq("conversation_id", conversation_id)
            .execute()
        )

    def delete_conversation(
        self,
        conversation_id: str,
    ) -> None:
        self.clear(conversation_id)

    def clear_all(self) -> None:
        (
            self.client
            .table("conversation_messages")
            .delete()
            .neq("conversation_id", "")
            .execute()
        )


memory = ConversationMemory()