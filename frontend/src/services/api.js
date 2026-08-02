const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export async function streamMessage(
  message,
  conversationId,
  onChunk
) {
  let response;

  try {
    response = await fetch(`${API_URL}/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
      }),
    });
  } catch {
    throw new Error(
      "Cannot connect to Nova's backend. Make sure FastAPI is running."
    );
  }

  if (!response.ok) {
    let errorMessage = "Nova encountered an unexpected error.";

    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch {
      // Response was not JSON.
    }

    throw new Error(errorMessage);
  }

  if (!response.body) {
    throw new Error("Streaming is not supported by this browser.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    const chunk = decoder.decode(value, {
      stream: true,
    });

    if (chunk) {
      onChunk(chunk);
    }
  }

  const finalChunk = decoder.decode();

  if (finalChunk) {
    onChunk(finalChunk);
  }
}