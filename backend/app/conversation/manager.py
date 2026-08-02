from app.conversation.memory import memory
from app.prompts.system_prompt import SYSTEM_PROMPT


class ConversationManager:

    def build_messages(
        self,
        user_message: str,
        conversation_id: str = "default"
    ):

        messages = [
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            }
        ]

        history = memory.get_messages(conversation_id)

        messages.extend(history)

        messages.append(
            {
                "role": "user",
                "content": user_message
            }
        )

        return messages

    def save_user_message(
        self,
        message: str,
        conversation_id: str = "default"
    ):

        memory.add_message(
            role="user",
            content=message,
            conversation_id=conversation_id
        )

    def save_assistant_message(
        self,
        message: str,
        conversation_id: str = "default"
    ):

        memory.add_message(
            role="assistant",
            content=message,
            conversation_id=conversation_id
        )

    def clear(self, conversation_id: str = "default"):

        memory.clear(conversation_id)


conversation_manager = ConversationManager()