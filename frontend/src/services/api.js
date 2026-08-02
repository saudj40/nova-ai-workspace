import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 120000,
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