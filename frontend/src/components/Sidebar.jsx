import { useEffect, useRef, useState } from "react";

import {
  MessageSquare,
  MessageSquarePlus,
  Pencil,
  Trash2,
  LogOut,
  ChevronUp,
  X,
} from "lucide-react";

import NovaLogo from "./NovaLogo";

function getAccountInitials(email) {
  const local = (email || "Nova").split("@")[0];
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase() || "N";
}

function Sidebar({
  chats,
  activeChatId,
  onHome,
  onNewChat,
  onSelectChat,
  onRenameChat,
  onDeleteChat,
  onClose,
  isLoading,
  userEmail,
  onSignOut,
  isSigningOut,
}) {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const footerRef = useRef(null);

  useEffect(() => {
    if (!accountMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!footerRef.current?.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountMenuOpen]);

  return (
    <aside className="sidebar">
      <button
        className="mobile-sidebar-close"
        onClick={onClose}
        aria-label="Close sidebar"
        title="Close sidebar"
      >
        <X size={19} />
      </button>

      <button
        className="brand brand-button"
        onClick={onHome}
        disabled={isLoading}
        aria-label="Go to Nova home"
        title="Nova Home"
      >
        <NovaLogo size="md" subtitle="AI Workspace" />
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

      <div className="sidebar-footer" ref={footerRef}>
        {accountMenuOpen && (
          <div className="account-menu" role="menu" aria-label="Account menu">
            <div className="account-menu-identity">
              <span>Signed in as</span>
              <strong title={userEmail || "Signed in"}>
                {userEmail || "Signed in"}
              </strong>
            </div>

            <button
              type="button"
              role="menuitem"
              className="account-menu-action"
              onClick={onSignOut}
              disabled={isLoading || isSigningOut}
            >
              <LogOut size={15} />
              <span>{isSigningOut ? "Logging out..." : "Log out"}</span>
            </button>
          </div>
        )}

        <button
          type="button"
          className={`sidebar-account ${accountMenuOpen ? "open" : ""}`}
          onClick={() => setAccountMenuOpen((current) => !current)}
          aria-expanded={accountMenuOpen}
          aria-haspopup="menu"
        >
          <span className="sidebar-account-avatar" aria-hidden="true">
            {getAccountInitials(userEmail)}
          </span>

          <span className="sidebar-account-copy">
            <strong title={userEmail || "Signed in"}>
              {userEmail || "Signed in"}
            </strong>
            <span>Personal workspace</span>
          </span>

          <ChevronUp
            size={15}
            className={`account-chevron ${accountMenuOpen ? "open" : ""}`}
            aria-hidden="true"
          />
        </button>

        <div className="local-status">
          <span className="status-dot" />

          <div className="local-status-copy">
            <strong>Nemotron 3 Ultra</strong>
            <p>Hosted AI</p>
          </div>

          <span className="model-state">Online</span>
        </div>
      </div>
    </aside>
  );
}


export default Sidebar;
