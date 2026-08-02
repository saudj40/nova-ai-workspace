import { ArrowUp, LoaderCircle } from "lucide-react";
import { useState } from "react";

function ChatInput({ onSend, isLoading }) {
  const [input, setInput] = useState("");

  function submitMessage() {
    const trimmedMessage = input.trim();

    if (!trimmedMessage || isLoading) {
      return;
    }

    onSend(trimmedMessage);
    setInput("");
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitMessage();
    }
  }

  return (
    <div className="input-area">
      <div className="input-container">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Nova..."
          rows="1"
          disabled={isLoading}
        />

        <button
          className="send-button"
          onClick={submitMessage}
          disabled={!input.trim() || isLoading}
          aria-label="Send message"
        >
          {isLoading ? (
            <LoaderCircle className="spinner" size={20} />
          ) : (
            <ArrowUp size={20} />
          )}
        </button>
      </div>

      <p className="input-hint">
        Nova runs locally. AI responses may contain mistakes.
      </p>
    </div>
  );
}

export default ChatInput;