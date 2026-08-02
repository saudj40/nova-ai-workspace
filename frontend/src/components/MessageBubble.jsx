import ReactMarkdown from "react-markdown";
import { Bot, UserRound } from "lucide-react";

function MessageBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <article className={`message-row ${isUser ? "user-row" : "assistant-row"}`}>
      <div className={`message-avatar ${isUser ? "user-avatar" : "ai-avatar"}`}>
        {isUser ? <UserRound size={18} /> : <Bot size={18} />}
      </div>

      <div className={`message-content ${isUser ? "user-message" : "ai-message"}`}>
        <div className="message-author">{isUser ? "You" : "Nova"}</div>

        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <ReactMarkdown>{message.content}</ReactMarkdown>
        )}
      </div>
    </article>
  );
}

export default MessageBubble;