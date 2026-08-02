import { useEffect, useRef, useState } from "react";
import { Menu, PanelLeftClose, Sparkles } from "lucide-react";

import Sidebar from "./components/Sidebar";
import WelcomeScreen from "./components/WelcomeScreen";
import MessageBubble from "./components/MessageBubble";
import ChatInput from "./components/ChatInput";
import { streamMessage } from "./services/api";

import "./App.css";

function App() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  async function handleSend(message) {
    if (!message.trim() || isLoading) {
      return;
    }

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    };

    const assistantMessageId = crypto.randomUUID();

    const assistantMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
    };

    setMessages((currentMessages) => [
      ...currentMessages,
      userMessage,
      assistantMessage,
    ]);

    setIsLoading(true);

    try {
      await streamMessage(message, (chunk) => {
        setMessages((currentMessages) =>
          currentMessages.map((currentMessage) =>
            currentMessage.id === assistantMessageId
              ? {
                  ...currentMessage,
                  content: currentMessage.content + chunk,
                }
              : currentMessage
          )
        );
      });
    } catch (error) {
      setMessages((currentMessages) =>
        currentMessages.map((currentMessage) =>
          currentMessage.id === assistantMessageId
            ? {
                ...currentMessage,
                content: `**Connection error:** ${error.message}`,
              }
            : currentMessage
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleNewChat() {
    if (isLoading) {
      return;
    }

    setMessages([]);
  }

  return (
    <div className="app-shell">
      <div
        className={`sidebar-wrapper ${
          sidebarOpen ? "open" : "closed"
        }`}
      >
        <Sidebar
          onNewChat={handleNewChat}
          hasMessages={messages.length > 0}
        />
      </div>

      <main className="main-panel">
        <header className="topbar">
          <button
            className="icon-button"
            onClick={() =>
              setSidebarOpen((current) => !current)
            }
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? (
              <PanelLeftClose size={20} />
            ) : (
              <Menu size={20} />
            )}
          </button>

          <div className="topbar-title">
            <Sparkles size={17} />
            <span>Nova</span>
          </div>

          <div className="model-badge">
            <span />
            Local model
          </div>
        </header>

        <section className="conversation-area">
          {messages.length === 0 ? (
            <WelcomeScreen onSuggestionClick={handleSend} />
          ) : (
            <div className="messages-container">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                />
              ))}

              {isLoading && (
                <div className="streaming-status">
                  <span />
                  Nova is generating
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </section>

        <ChatInput
          onSend={handleSend}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
}

export default App;