import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  Check,
  Copy,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useState } from "react";

function MessageBubble({ message }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <motion.article
      className={`message-row ${
        isUser ? "user-row" : "assistant-row"
      }`}
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.38,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div
        className={`message-avatar ${
          isUser ? "user-avatar" : "ai-avatar"
        }`}
      >
        {isUser ? (
          <UserRound size={16} strokeWidth={1.8} />
        ) : (
          <Sparkles size={16} strokeWidth={1.8} />
        )}
      </div>

      <div
        className={`message-content ${
          isUser ? "user-message" : "ai-message"
        }`}
      >
        <div className="message-heading">
          <span className="message-author">
            {isUser ? "You" : "Nova"}
          </span>

          {!isUser && message.content && (
            <button
              className="copy-message-button"
              onClick={copyMessage}
              aria-label="Copy response"
              title="Copy response"
            >
              {copied ? (
                <Check size={14} />
              ) : (
                <Copy size={14} />
              )}
            </button>
          )}
        </div>

        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <div className="markdown-content">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </motion.article>
  );
}

export default MessageBubble;