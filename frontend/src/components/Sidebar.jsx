import {
  MessageSquare,
  MessageSquarePlus,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";


function Sidebar({
  chats,
  activeChatId,
  onHome,
  onNewChat,
  onSelectChat,
  onRenameChat,
  onDeleteChat,
  isLoading,
}) {
  return (
    <aside className="sidebar">
      <button
        className="brand brand-button"
        onClick={onHome}
        disabled={isLoading}
        aria-label="Go to Nova home"
        title="Nova Home"
      >
        <div className="brand-icon">
          <Sparkles size={22} />
        </div>

        <div>
          <h1>Nova</h1>
          <span>AI Workspace</span>
        </div>
      </button>

      <button
        className="new-chat-button"
        onClick={onNewChat}
        disabled={isLoading}
      >
        <MessageSquarePlus size={18} />
        New chat
      </button>

      <div className="sidebar-section chat-list-section">
        <p className="sidebar-label">
          Conversations
        </p>

        <div className="chat-list">
          {chats.map((chat) => {
            const isActive =
              chat.id === activeChatId;

            return (
              <div
                className={`chat-list-item ${
                  isActive ? "active" : ""
                }`}
                key={chat.id}
              >
                <button
                  className="chat-select-button"
                  onClick={() =>
                    onSelectChat(chat.id)
                  }
                  disabled={isLoading}
                  title={chat.title}
                >
                  <MessageSquare size={16} />

                  <span>
                    {chat.title}
                  </span>
                </button>

                <div className="chat-actions">
                  <button
                    onClick={() =>
                      onRenameChat(chat.id)
                    }
                    disabled={isLoading}
                    aria-label="Rename conversation"
                    title="Rename"
                  >
                    <Pencil size={14} />
                  </button>

                  <button
                    className="delete-chat-button"
                    onClick={() =>
                      onDeleteChat(chat.id)
                    }
                    disabled={isLoading}
                    aria-label="Delete conversation"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="local-status">
        <span className="status-dot" />

        <div>
          <strong>Hosted AI</strong>
          <p>Nemotron 3 Ultra</p>
        </div>
      </div>
    </aside>
  );
}


export default Sidebar;