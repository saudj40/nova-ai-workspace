import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 180000,
});

export async function sendMessage(message) {
  try {
    const response = await api.post("/chat", {
      message,
    });

    return (
      response.data.response ||
      response.data.message ||
      response.data.reply ||
      "Nova returned an empty response."
    );
  } catch (error) {
    if (error.code === "ECONNABORTED") {
      throw new Error("Nova took too long to respond.");
    }

    if (!error.response) {
      throw new Error(
        "Cannot connect to Nova's backend. Make sure FastAPI is running."
      );
    }

    throw new Error(
      error.response.data?.detail ||
        error.response.data?.message ||
        "Nova encountered an unexpected error."
    );
  }
}

export async function streamMessage(message, onChunk) {
  let response;

  try {
    response = await fetch(`${API_URL}/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
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
      // The error response was not JSON.
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