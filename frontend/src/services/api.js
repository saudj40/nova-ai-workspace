const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";


function createSmoothWriter(onChunk) {
  let buffer = "";
  let streamFinished = false;
  let animationFrameId = null;
  let resolveFinished;

  const finishedPromise = new Promise((resolve) => {
    resolveFinished = resolve;
  });

  function getCharactersPerFrame() {
    /*
      Keep short responses smooth while automatically
      accelerating when many characters are waiting.
    */

    if (buffer.length > 1200) {
      return 20;
    }

    if (buffer.length > 600) {
      return 12;
    }

    if (buffer.length > 250) {
      return 7;
    }

    if (buffer.length > 80) {
      return 4;
    }

    return 2;
  }

  function animate() {
    if (buffer.length > 0) {
      const charactersToWrite =
        getCharactersPerFrame();

      const visibleText = buffer.slice(
        0,
        charactersToWrite
      );

      buffer = buffer.slice(charactersToWrite);

      onChunk(visibleText);
    }

    if (streamFinished && buffer.length === 0) {
      animationFrameId = null;
      resolveFinished();
      return;
    }

    animationFrameId =
      window.requestAnimationFrame(animate);
  }

  function startAnimation() {
    if (animationFrameId !== null) {
      return;
    }

    animationFrameId =
      window.requestAnimationFrame(animate);
  }

  return {
    push(text) {
      if (!text) {
        return;
      }

      buffer += text;
      startAnimation();
    },

    finish() {
      streamFinished = true;
      startAnimation();
    },

    waitUntilFinished() {
      return finishedPromise;
    },
  };
}


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
    let errorMessage =
      "Nova encountered an unexpected error.";

    try {
      const errorData = await response.json();

      errorMessage =
        errorData.detail || errorMessage;
    } catch {
      // The response was not JSON.
    }

    throw new Error(errorMessage);
  }

  if (!response.body) {
    throw new Error(
      "Streaming is not supported by this browser."
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  const smoothWriter =
    createSmoothWriter(onChunk);

  try {
    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      const receivedText = decoder.decode(value, {
        stream: true,
      });

      smoothWriter.push(receivedText);
    }

    const finalText = decoder.decode();

    smoothWriter.push(finalText);
    smoothWriter.finish();

    await smoothWriter.waitUntilFinished();
  } finally {
    reader.releaseLock();
  }
}


export async function deleteConversation(
  conversationId
) {
  let response;

  try {
    response = await fetch(
      `${API_URL}/conversations/${encodeURIComponent(
        conversationId
      )}`,
      {
        method: "DELETE",
      }
    );
  } catch {
    throw new Error(
      "Cannot connect to Nova's backend. Make sure FastAPI is running."
    );
  }

  if (!response.ok) {
    let errorMessage =
      "Could not delete the conversation from Nova.";

    try {
      const errorData = await response.json();

      errorMessage =
        errorData.detail || errorMessage;
    } catch {
      // Successful DELETE responses have no JSON body.
    }

    throw new Error(errorMessage);
  }
}