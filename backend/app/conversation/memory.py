class ConversationMemory:
    """
    Stores conversation history in memory.

    Later we'll replace this with Redis or PostgreSQL
    without changing the rest of Nova.
    """

    def __init__(self):
        self._conversations = {}

    def get_messages(self, conversation_id: str = "default"):

        return self._conversations.get(conversation_id, [])

    def add_message(
        self,
        role: str,
        content: str,
        conversation_id: str = "default"
    ):

        if conversation_id not in self._conversations:
            self._conversations[conversation_id] = []

        self._conversations[conversation_id].append(
            {
                "role": role,
                "content": content
            }
        )

    def clear(self, conversation_id: str = "default"):

        self._conversations[conversation_id] = []


memory = ConversationMemory()