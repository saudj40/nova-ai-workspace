import sqlite3
from pathlib import Path
from threading import Lock


class ConversationMemory:
    """
    Stores Nova conversation history persistently in SQLite.

    Each conversation is isolated using its conversation_id.
    The database survives FastAPI restarts.
    """

    def __init__(self):
        backend_directory = Path(__file__).resolve().parents[2]
        data_directory = backend_directory / "data"

        data_directory.mkdir(parents=True, exist_ok=True)

        self.database_path = data_directory / "nova.db"
        self._lock = Lock()

        self._initialize_database()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(
            self.database_path,
            timeout=30,
        )

        connection.row_factory = sqlite3.Row

        return connection

    def _initialize_database(self) -> None:
        with self._lock:
            with self._connect() as connection:
                connection.execute(
                    """
                    CREATE TABLE IF NOT EXISTS conversation_messages (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        conversation_id TEXT NOT NULL,
                        role TEXT NOT NULL,
                        content TEXT NOT NULL,
                        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )
                    """
                )

                connection.execute(
                    """
                    CREATE INDEX IF NOT EXISTS
                    idx_conversation_messages_conversation_id
                    ON conversation_messages(conversation_id)
                    """
                )

                connection.commit()

    def get_messages(
        self,
        conversation_id: str = "default",
    ) -> list[dict[str, str]]:
        with self._lock:
            with self._connect() as connection:
                rows = connection.execute(
                    """
                    SELECT role, content
                    FROM conversation_messages
                    WHERE conversation_id = ?
                    ORDER BY id ASC
                    """,
                    (conversation_id,),
                ).fetchall()

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
            raise ValueError(f"Unsupported conversation role: {role}")

        cleaned_content = content.strip()

        if not cleaned_content:
            return

        with self._lock:
            with self._connect() as connection:
                connection.execute(
                    """
                    INSERT INTO conversation_messages (
                        conversation_id,
                        role,
                        content
                    )
                    VALUES (?, ?, ?)
                    """,
                    (
                        conversation_id,
                        role,
                        cleaned_content,
                    ),
                )

                connection.commit()

    def clear(
        self,
        conversation_id: str = "default",
    ) -> None:
        with self._lock:
            with self._connect() as connection:
                connection.execute(
                    """
                    DELETE FROM conversation_messages
                    WHERE conversation_id = ?
                    """,
                    (conversation_id,),
                )

                connection.commit()

    def delete_conversation(
        self,
        conversation_id: str,
    ) -> None:
        self.clear(conversation_id)

    def clear_all(self) -> None:
        with self._lock:
            with self._connect() as connection:
                connection.execute(
                    "DELETE FROM conversation_messages"
                )

                connection.commit()


memory = ConversationMemory()