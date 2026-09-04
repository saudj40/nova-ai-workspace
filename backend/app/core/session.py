import hashlib


def get_scoped_conversation_id(
    session_id: str,
    conversation_id: str,
) -> str:
    """
    Create an internal conversation identifier
    scoped to one anonymous Nova browser session.

    The raw session ID is never stored in the
    conversation/document storage layer.
    """

    clean_session_id = session_id.strip()
    clean_conversation_id = (
        conversation_id.strip()
    )

    if not clean_session_id:
        raise ValueError(
            "Nova session ID is required."
        )

    if not clean_conversation_id:
        raise ValueError(
            "Conversation ID is required."
        )

    value = (
        f"{clean_session_id}:"
        f"{clean_conversation_id}"
    )

    digest = hashlib.sha256(
        value.encode("utf-8")
    ).hexdigest()

    return f"session_{digest}"