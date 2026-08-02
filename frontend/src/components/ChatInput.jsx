import { motion } from "framer-motion";
import {
  ArrowUp,
  CornerDownLeft,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

function ChatInput({ onSend, isLoading }) {
  const [input, setInput] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 170)}px`;
  }, [input]);

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
      <motion.div
        className="input-shell"
        initial={{
          opacity: 0,
          y: 12,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.5,
          delay: 0.15,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <div className="composer-brand">
          <Sparkles size={17} strokeWidth={1.8} />
        </div>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Nova anything..."
          rows="1"
          disabled={isLoading}
          aria-label="Message Nova"
        />

        <div className="composer-actions">
          <div className="keyboard-hint">
            <CornerDownLeft size={13} />
            <span>Enter</span>
          </div>

          <motion.button
            className="send-button"
            onClick={submitMessage}
            disabled={!input.trim() || isLoading}
            aria-label="Send message"
            whileHover={
              input.trim() && !isLoading
                ? {
                    scale: 1.04,
                  }
                : undefined
            }
            whileTap={
              input.trim() && !isLoading
                ? {
                    scale: 0.94,
                  }
                : undefined
            }
          >
            {isLoading ? (
              <LoaderCircle className="spinner" size={18} />
            ) : (
              <ArrowUp size={18} strokeWidth={2.2} />
            )}
          </motion.button>
        </div>
      </motion.div>

      <p className="input-hint">
        Nova can make mistakes. Verify important information.
      </p>
    </div>
  );
}

export default ChatInput;