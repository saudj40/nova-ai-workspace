import { MessageSquarePlus, Sparkles, Trash2 } from "lucide-react";

function Sidebar({ onNewChat, hasMessages }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <Sparkles size={22} />
        </div>

        <div>
          <h1>Nova</h1>
          <span>AI Workspace</span>
        </div>
      </div>

      <button className="new-chat-button" onClick={onNewChat}>
        <MessageSquarePlus size={18} />
        New chat
      </button>

      <div className="sidebar-section">
        <p className="sidebar-label">Workspace</p>

        <div className="sidebar-item active">
          <span className="sidebar-dot" />
          Current conversation
        </div>
      </div>

      <div className="sidebar-spacer" />

      {hasMessages && (
        <button className="clear-button" onClick={onNewChat}>
          <Trash2 size={17} />
          Clear conversation
        </button>
      )}

      <div className="local-status">
        <span className="status-dot" />

        <div>
          <strong>Local AI</strong>
          <p>Powered by Ollama</p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;