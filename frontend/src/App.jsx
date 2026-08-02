import { useEffect, useRef, useState } from "react";
import {
  Menu,
  PanelLeftClose,
  Sparkles,
} from "lucide-react";

import Sidebar from "./components/Sidebar";
import WelcomeScreen from "./components/WelcomeScreen";
import MessageBubble from "./components/MessageBubble";
import ChatInput from "./components/ChatInput";

import {
  deleteConversation,
  streamMessage,
} from "./services/api";

import "./App.css";


const STORAGE_KEY = "nova-chats";
const ACTIVE_CHAT_KEY = "nova-active-chat";


function createNewChat() {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    title: "New conversation",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}


function loadChats() {
  try {
    const savedChats = localStorage.getItem(STORAGE_KEY);

    if (!savedChats) {
      return [createNewChat()];
    }

    const parsedChats = JSON.parse(savedChats);

    if (
      !Array.isArray(parsedChats) ||
      parsedChats.length === 0
    ) {
      return [createNewChat()];
    }

    return parsedChats;
  } catch {
    return [createNewChat()];
  }
}


function App() {
  const initialChatsRef = useRef(loadChats());
  const conversationAreaRef = useRef(null);

  const [chats, setChats] = useState(
    initialChatsRef.current
  );

  const [activeChatId, setActiveChatId] = useState(() => {
    const savedActiveChatId =
      localStorage.getItem(ACTIVE_CHAT_KEY);

    const savedChatExists =
      initialChatsRef.current.some(
        (chat) => chat.id === savedActiveChatId
      );

    return savedChatExists
      ? savedActiveChatId
      : initialChatsRef.current[0].id;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeChat =
    chats.find((chat) => chat.id === activeChatId) ||
    chats[0];

  const messages = activeChat?.messages || [];


  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(chats)
    );
  }, [chats]);


  useEffect(() => {
    if (activeChatId) {
      localStorage.setItem(
        ACTIVE_CHAT_KEY,
        activeChatId
      );
    }
  }, [activeChatId]);


  useEffect(() => {
    const conversationArea =
      conversationAreaRef.current;

    if (!conversationArea) {
      return;
    }

    conversationArea.scrollTo({
      top: conversationArea.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);


  function updateChatMessages(chatId, updater) {
    setChats((currentChats) =>
      currentChats.map((chat) => {
        if (chat.id !== chatId) {
          return chat;
        }

        return {
          ...chat,
          messages: updater(chat.messages),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }


  async function handleSend(message) {
    const trimmedMessage = message.trim();

    if (
      !trimmedMessage ||
      isLoading ||
      !activeChat
    ) {
      return;
    }

    const targetChatId = activeChat.id;

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedMessage,
    };

    const assistantMessageId =
      crypto.randomUUID();

    const assistantMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
    };

    setChats((currentChats) =>
      currentChats.map((chat) => {
        if (chat.id !== targetChatId) {
          return chat;
        }

        const shouldCreateTitle =
          chat.title === "New conversation" &&
          chat.messages.length === 0;

        const generatedTitle =
          trimmedMessage.length > 32
            ? `${trimmedMessage.slice(0, 32)}...`
            : trimmedMessage;

        return {
          ...chat,
          title: shouldCreateTitle
            ? generatedTitle
            : chat.title,
          messages: [
            ...chat.messages,
            userMessage,
            assistantMessage,
          ],
          updatedAt: new Date().toISOString(),
        };
      })
    );

    setIsLoading(true);

    try {
      await streamMessage(
        trimmedMessage,
        targetChatId,
        (chunk) => {
          updateChatMessages(
            targetChatId,
            (currentMessages) =>
              currentMessages.map(
                (currentMessage) =>
                  currentMessage.id ===
                  assistantMessageId
                    ? {
                        ...currentMessage,
                        content:
                          currentMessage.content +
                          chunk,
                      }
                    : currentMessage
              )
          );
        }
      );
    } catch (error) {
      updateChatMessages(
        targetChatId,
        (currentMessages) =>
          currentMessages.map(
            (currentMessage) =>
              currentMessage.id === assistantMessageId
                ? {
                    ...currentMessage,
                    content:
                      `**Connection error:** ${error.message}`,
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

    const emptyExistingChat = chats.find(
      (chat) => chat.messages.length === 0
    );

    if (emptyExistingChat) {
      setActiveChatId(emptyExistingChat.id);
      return;
    }

    const newChat = createNewChat();

    setChats((currentChats) => [
      newChat,
      ...currentChats,
    ]);

    setActiveChatId(newChat.id);
  }


  function handleSelectChat(chatId) {
    if (isLoading) {
      return;
    }

    setActiveChatId(chatId);
  }


  function handleRenameChat(chatId) {
    if (isLoading) {
      return;
    }

    const chat = chats.find(
      (currentChat) => currentChat.id === chatId
    );

    if (!chat) {
      return;
    }

    const newTitle = window.prompt(
      "Rename conversation:",
      chat.title
    );

    const trimmedTitle = newTitle?.trim();

    if (!trimmedTitle) {
      return;
    }

    setChats((currentChats) =>
      currentChats.map((currentChat) =>
        currentChat.id === chatId
          ? {
              ...currentChat,
              title: trimmedTitle,
              updatedAt: new Date().toISOString(),
            }
          : currentChat
      )
    );
  }


  async function handleDeleteChat(chatId) {
    if (isLoading) {
      return;
    }

    const chat = chats.find(
      (currentChat) => currentChat.id === chatId
    );

    if (!chat) {
      return;
    }

    const shouldDelete = window.confirm(
      `Delete "${chat.title}"?`
    );

    if (!shouldDelete) {
      return;
    }

    try {
      await deleteConversation(chatId);
    } catch (error) {
      window.alert(error.message);
      return;
    }

    const remainingChats = chats.filter(
      (currentChat) => currentChat.id !== chatId
    );

    if (remainingChats.length === 0) {
      const newChat = createNewChat();

      setChats([newChat]);
      setActiveChatId(newChat.id);

      return;
    }

    setChats(remainingChats);

    if (activeChatId === chatId) {
      setActiveChatId(remainingChats[0].id);
    }
  }


  return (
    <div className="app-shell">
      <div
        className={`sidebar-wrapper ${
          sidebarOpen ? "open" : "closed"
        }`}
      >
        <Sidebar
          chats={chats}
          activeChatId={activeChatId}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          onRenameChat={handleRenameChat}
          onDeleteChat={handleDeleteChat}
          isLoading={isLoading}
        />
      </div>

      <main className="main-panel">
        <header className="topbar">
          <button
            className="icon-button"
            onClick={() =>
              setSidebarOpen(
                (current) => !current
              )
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

            <span>
              {activeChat?.title || "Nova"}
            </span>
          </div>

          <div className="model-badge">
            <span />
            Local model
          </div>
        </header>

        <section
          ref={conversationAreaRef}
          className="conversation-area"
        >
          {messages.length === 0 ? (
            <WelcomeScreen
              onSuggestionClick={handleSend}
            />
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