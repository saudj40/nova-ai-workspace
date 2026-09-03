const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000";


function createSmoothWriter(onChunk) {
  let buffer = "";
  let streamFinished = false;
  let cancelled = false;
  let animationFrameId = null;
  let resolveFinished;
  let hasResolved = false;

  const finishedPromise =
    new Promise((resolve) => {
      resolveFinished = resolve;
    });

  function resolveOnce() {
    if (hasResolved) {
      return;
    }

    hasResolved = true;
    resolveFinished();
  }

  function getCharactersPerFrame() {
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
    if (cancelled) {
      animationFrameId = null;
      resolveOnce();
      return;
    }

    if (buffer.length > 0) {
      const charactersToWrite =
        getCharactersPerFrame();

      const visibleText =
        buffer.slice(
          0,
          charactersToWrite
        );

      buffer = buffer.slice(
        charactersToWrite
      );

      onChunk(visibleText);
    }

    if (
      streamFinished &&
      buffer.length === 0
    ) {
      animationFrameId = null;
      resolveOnce();
      return;
    }

    animationFrameId =
      window.requestAnimationFrame(
        animate
      );
  }

  function startAnimation() {
    if (
      animationFrameId !== null ||
      cancelled
    ) {
      return;
    }

    animationFrameId =
      window.requestAnimationFrame(
        animate
      );
  }

  return {
    push(text) {
      if (!text || cancelled) {
        return;
      }

      buffer += text;
      startAnimation();
    },

    finish() {
      if (cancelled) {
        return;
      }

      streamFinished = true;
      startAnimation();
    },

    cancel() {
      cancelled = true;
      buffer = "";

      if (
        animationFrameId !== null
      ) {
        window.cancelAnimationFrame(
          animationFrameId
        );

        animationFrameId = null;
      }

      resolveOnce();
    },

    waitUntilFinished() {
      return finishedPromise;
    },
  };
}


async function getErrorMessage(
  response,
  fallbackMessage
) {
  try {
    const errorData =
      await response.json();

    return (
      errorData.detail ||
      fallbackMessage
    );
  } catch {
    return fallbackMessage;
  }
}


export async function streamMessage(
  message,
  conversationId,
  onChunk,
  signal
) {
  let response;
  let smoothWriter;

  try {
    response = await fetch(
      `${API_URL}/chat/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          message,
          conversation_id:
            conversationId,
        }),
        signal,
      }
    );
  } catch (error) {
    if (
      error.name === "AbortError"
    ) {
      throw error;
    }

    throw new Error(
      "Cannot connect to Nova's backend. "
      + "Make sure FastAPI is running."
    );
  }

  if (!response.ok) {
    const errorMessage =
      await getErrorMessage(
        response,
        "Nova encountered "
          + "an unexpected error."
      );

    throw new Error(errorMessage);
  }

  if (!response.body) {
    throw new Error(
      "Streaming is not supported "
      + "by this browser."
    );
  }

  const reader =
    response.body.getReader();

  const decoder =
    new TextDecoder();

  smoothWriter =
    createSmoothWriter(onChunk);

  function handleAbort() {
    smoothWriter.cancel();

    reader.cancel().catch(() => {
      // Reader may already be closed.
    });
  }

  signal?.addEventListener(
    "abort",
    handleAbort,
    {
      once: true,
    }
  );

  try {
    while (true) {
      const { value, done } =
        await reader.read();

      if (done) {
        break;
      }

      const receivedText =
        decoder.decode(
          value,
          {
            stream: true,
          }
        );

      smoothWriter.push(
        receivedText
      );
    }

    smoothWriter.push(
      decoder.decode()
    );

    smoothWriter.finish();

    await smoothWriter
      .waitUntilFinished();
  } catch (error) {
    smoothWriter.cancel();

    if (
      error.name === "AbortError" ||
      signal?.aborted
    ) {
      throw new DOMException(
        "Generation stopped",
        "AbortError"
      );
    }

    throw error;
  } finally {
    signal?.removeEventListener(
      "abort",
      handleAbort
    );

    try {
      reader.releaseLock();
    } catch {
      // Reader may already be cancelled.
    }
  }
}


export async function uploadDocument(
  file,
  conversationId
) {
  const formData =
    new FormData();

  formData.append(
    "conversation_id",
    conversationId
  );

  formData.append(
    "file",
    file
  );

  let response;

  try {
    response = await fetch(
      `${API_URL}/documents/upload`,
      {
        method: "POST",
        body: formData,
      }
    );
  } catch {
    throw new Error(
      "Cannot connect to "
      + "Nova's backend."
    );
  }

  if (!response.ok) {
    const errorMessage =
      await getErrorMessage(
        response,
        "The PDF could "
          + "not be uploaded."
      );

    throw new Error(errorMessage);
  }

  return response.json();
}


export async function getDocuments(
  conversationId
) {
  let response;

  try {
    response = await fetch(
      `${API_URL}/documents/conversation/${encodeURIComponent(
        conversationId
      )}`
    );
  } catch {
    throw new Error(
      "Cannot connect to "
      + "Nova's backend."
    );
  }

  if (!response.ok) {
    const errorMessage =
      await getErrorMessage(
        response,
        "Could not load "
          + "conversation documents."
      );

    throw new Error(errorMessage);
  }

  const data =
    await response.json();

  return data.documents || [];
}


export async function deleteDocument(
  conversationId,
  documentId
) {
  let response;

  try {
    response = await fetch(
      `${API_URL}/documents/conversation/${encodeURIComponent(
        conversationId
      )}/${encodeURIComponent(
        documentId
      )}`,
      {
        method: "DELETE",
      }
    );
  } catch {
    throw new Error(
      "Cannot connect to "
      + "Nova's backend."
    );
  }

  if (!response.ok) {
    const errorMessage =
      await getErrorMessage(
        response,
        "Could not delete "
          + "the document."
      );

    throw new Error(errorMessage);
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
      "Cannot connect to "
      + "Nova's backend."
    );
  }

  if (!response.ok) {
    const errorMessage =
      await getErrorMessage(
        response,
        "Could not delete "
          + "the conversation."
      );

    throw new Error(errorMessage);
  }
}