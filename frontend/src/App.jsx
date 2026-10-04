import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  Info,
  Menu,
  PanelLeftClose,
  X,
} from "lucide-react";

import Sidebar from "./components/Sidebar";
import WelcomeScreen from "./components/WelcomeScreen";
import MessageBubble from "./components/MessageBubble";
import ChatInput from "./components/ChatInput";
import AuthScreen from "./components/AuthScreen";
import LandingPage from "./components/LandingPage";
import NovaLogo from "./components/NovaLogo";
import { useAuth } from "./context/AuthContext.jsx";


import {
  deleteConversation,
  deleteDocument,
  getDocuments,
  streamMessage,
  uploadDocument,
} from "./services/api";

import "./App.css";


const STORAGE_KEY = "nova-chats";
const ACTIVE_CHAT_KEY = "nova-active-chat";


function createId() {
  if (globalThis.crypto?.randomUUID) {
    return crypto.randomUUID();
  }

  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2),
    Math.random().toString(36).slice(2),
  ].join("-");
}


function createNewChat() {
  const now =
    new Date().toISOString();

  return {
    id: createId(),
    title: "New conversation",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}


function loadChats() {
  try {
    const savedChats =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (!savedChats) {
      return [
        createNewChat(),
      ];
    }

    const parsedChats =
      JSON.parse(savedChats);

    if (
      !Array.isArray(
        parsedChats
      ) ||
      parsedChats.length === 0
    ) {
      return [
        createNewChat(),
      ];
    }

    return parsedChats;

  } catch {
    return [
      createNewChat(),
    ];
  }
}


function NovaWorkspace() {
  const { user, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  // existing code continues below
  const initialChatsRef =
    useRef(loadChats());

  const conversationAreaRef =
    useRef(null);

  const abortControllerRef =
    useRef(null);

  const documentLoadRequestRef =
    useRef(0);

  const toastTimerRef =
    useRef(null);


  const [
    chats,
    setChats,
  ] = useState(
    initialChatsRef.current
  );


  const [
    activeChatId,
    setActiveChatId,
  ] = useState(() => {
    const savedActiveChatId =
      localStorage.getItem(
        ACTIVE_CHAT_KEY
      );

    const savedChatExists =
      initialChatsRef.current.some(
        (chat) =>
          chat.id ===
          savedActiveChatId
      );

    return savedChatExists
      ? savedActiveChatId
      : initialChatsRef
          .current[0].id;
  });


  const [
    isHome,
    setIsHome,
  ] = useState(true);


  const [
    isLoading,
    setIsLoading,
  ] = useState(false);


  const [
    isUploading,
    setIsUploading,
  ] = useState(false);


  const [
    isLoadingDocuments,
    setIsLoadingDocuments,
  ] = useState(false);


  const [
    deletingDocumentId,
    setDeletingDocumentId,
  ] = useState(null);


  const [
    uploadedDocuments,
    setUploadedDocuments,
  ] = useState([]);


  const [
    toast,
    setToast,
  ] = useState(null);


  const [
    confirmation,
    setConfirmation,
  ] = useState(null);


  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(() => {
    if (
      typeof window
      === "undefined"
    ) {
      return true;
    }

    return !window.matchMedia(
      "(max-width: 760px)"
    ).matches;
  });


  const activeChat =
    chats.find(
      (chat) =>
        chat.id === activeChatId
    ) || null;


  const messages =
    isHome
      ? []
      : activeChat?.messages || [];


  const interfaceLocked =
    isLoading ||
    isUploading ||
    Boolean(
      deletingDocumentId
    );


  function hideToast() {
    if (
      toastTimerRef.current
    ) {
      clearTimeout(
        toastTimerRef.current
      );

      toastTimerRef.current = null;
    }

    setToast(null);
  }


  function showToast(
    message,
    type = "error",
    duration = 4500
  ) {
    if (
      toastTimerRef.current
    ) {
      clearTimeout(
        toastTimerRef.current
      );
    }

    setToast({
      id: createId(),
      message,
      type,
    });

    toastTimerRef.current =
      setTimeout(() => {
        setToast(null);

        toastTimerRef.current =
          null;
      }, duration);
  }


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
    if (
      isHome ||
      !activeChatId
    ) {
      documentLoadRequestRef
        .current += 1;

      setUploadedDocuments([]);
      setIsLoadingDocuments(false);

      return;
    }


    const requestId =
      documentLoadRequestRef
        .current + 1;

    documentLoadRequestRef
      .current = requestId;


    async function loadDocuments() {
      setIsLoadingDocuments(true);

      try {
        const documents =
          await getDocuments(
            activeChatId
          );

        if (
          documentLoadRequestRef
            .current !== requestId
        ) {
          return;
        }

        setUploadedDocuments(
          documents
        );

      } catch (error) {
        if (
          documentLoadRequestRef
            .current !== requestId
        ) {
          return;
        }

        console.error(
          "Could not load documents:",
          error
        );

        setUploadedDocuments([]);

      } finally {
        if (
          documentLoadRequestRef
            .current === requestId
        ) {
          setIsLoadingDocuments(
            false
          );
        }
      }
    }


    loadDocuments();

  }, [
    activeChatId,
    isHome,
  ]);


  useEffect(() => {
    const conversationArea =
      conversationAreaRef.current;

    if (!conversationArea) {
      return;
    }

    conversationArea.scrollTo({
      top:
        conversationArea
          .scrollHeight,

      behavior: "smooth",
    });

  }, [
    messages,
    isLoading,
    isHome,
  ]);


  useEffect(() => {
    return () => {
      abortControllerRef
        .current?.abort();

      if (
        toastTimerRef.current
      ) {
        clearTimeout(
          toastTimerRef.current
        );
      }
    };
  }, []);


  useEffect(() => {
    const mediaQuery =
      window.matchMedia(
        "(max-width: 760px)"
      );

    function handleViewportChange(
      event
    ) {
      setSidebarOpen(
        !event.matches
      );
    }

    mediaQuery.addEventListener(
      "change",
      handleViewportChange
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        handleViewportChange
      );
    };
  }, []);


  useEffect(() => {
    function handleEscape(event) {
      if (
        event.key === "Escape" &&
        confirmation
      ) {
        setConfirmation(null);
        return;
      }

      if (
        event.key === "Escape" &&
        sidebarOpen &&
        window.matchMedia(
          "(max-width: 760px)"
        ).matches
      ) {
        setSidebarOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };

  }, [
    sidebarOpen,
    confirmation,
  ]);


  function closeSidebarOnMobile() {
    if (
      window.matchMedia(
        "(max-width: 760px)"
      ).matches
    ) {
      setSidebarOpen(false);
    }
  }


  function updateChatMessages(
    chatId,
    updater
  ) {
    setChats(
      (currentChats) =>
        currentChats.map(
          (chat) => {
            if (
              chat.id !== chatId
            ) {
              return chat;
            }

            return {
              ...chat,

              messages:
                updater(
                  chat.messages
                ),

              updatedAt:
                new Date()
                  .toISOString(),
            };
          }
        )
    );
  }


  function prepareHomeChat() {
    const emptyExistingChat =
      chats.find(
        (chat) =>
          chat.messages.length === 0
      );

    if (emptyExistingChat) {
      setActiveChatId(
        emptyExistingChat.id
      );

      setIsHome(false);

      return emptyExistingChat.id;
    }


    const newChat =
      createNewChat();

    setChats(
      (currentChats) => [
        newChat,
        ...currentChats,
      ]
    );

    setActiveChatId(
      newChat.id
    );

    setIsHome(false);

    return newChat.id;
  }


  async function handleSend(
    message
  ) {
    const trimmedMessage =
      message.trim();

    if (
      !trimmedMessage ||
      isLoading ||
      isUploading
    ) {
      return;
    }


    let targetChatId =
      activeChat?.id;

    if (isHome) {
      targetChatId =
        prepareHomeChat();

    } else if (
      !targetChatId
    ) {
      targetChatId =
        prepareHomeChat();
    }


    const userMessage = {
      id: createId(),
      role: "user",
      content:
        trimmedMessage,
    };


    const assistantMessageId =
      createId();


    const assistantMessage = {
      id:
        assistantMessageId,

      role: "assistant",

      content: "",
    };


    const controller =
      new AbortController();

    abortControllerRef
      .current = controller;


    setChats(
      (currentChats) =>
        currentChats.map(
          (chat) => {
            if (
              chat.id !==
              targetChatId
            ) {
              return chat;
            }


            const shouldCreateTitle =
              chat.title ===
                "New conversation" &&
              chat.messages.length === 0;


            const generatedTitle =
              trimmedMessage.length > 32
                ? `${trimmedMessage.slice(
                    0,
                    32
                  )}...`
                : trimmedMessage;


            return {
              ...chat,

              title:
                shouldCreateTitle
                  ? generatedTitle
                  : chat.title,

              messages: [
                ...chat.messages,
                userMessage,
                assistantMessage,
              ],

              updatedAt:
                new Date()
                  .toISOString(),
            };
          }
        )
    );


    setIsLoading(true);


    try {
      await streamMessage(
        trimmedMessage,
        targetChatId,

        (chunk) => {
          updateChatMessages(
            targetChatId,

            (
              currentMessages
            ) =>
              currentMessages.map(
                (
                  currentMessage
                ) =>
                  currentMessage.id ===
                  assistantMessageId

                    ? {
                        ...currentMessage,

                        content:
                          currentMessage
                            .content +
                          chunk,
                      }

                    : currentMessage
              )
          );
        },

        controller.signal
      );

    } catch (error) {
      if (
        error.name ===
        "AbortError"
      ) {
        updateChatMessages(
          targetChatId,

          (
            currentMessages
          ) =>
            currentMessages.map(
              (
                currentMessage
              ) => {
                if (
                  currentMessage.id !==
                  assistantMessageId
                ) {
                  return currentMessage;
                }

                const existingContent =
                  currentMessage
                    .content
                    .trim();

                return {
                  ...currentMessage,

                  content:
                    existingContent
                      ? `${currentMessage.content}\n\n*Generation stopped.*`
                      : "*Generation stopped.*",
                };
              }
            )
        );

      } else {
        showToast(
          error.message ||
            "Nova could not complete the response.",
          "error"
        );

        updateChatMessages(
          targetChatId,

          (
            currentMessages
          ) =>
            currentMessages.map(
              (
                currentMessage
              ) =>
                currentMessage.id ===
                assistantMessageId

                  ? {
                      ...currentMessage,

                      content:
                        "*Nova couldn't complete this response. Please try again.*",
                    }

                  : currentMessage
            )
        );
      }

    } finally {
      abortControllerRef
        .current = null;

      setIsLoading(false);
    }
  }


  function handleStopGeneration() {
    if (
      !isLoading ||
      !abortControllerRef
        .current
    ) {
      return;
    }

    abortControllerRef
      .current.abort();
  }


  async function handleUploadDocument(
    file
  ) {
    if (
      isLoading ||
      isUploading
    ) {
      return;
    }


    const isPdf =
      file.type ===
        "application/pdf" ||
      file.name
        .toLowerCase()
        .endsWith(".pdf");


    if (!isPdf) {
      showToast(
        "Please select a PDF file.",
        "warning"
      );

      return;
    }


    let targetChatId =
      activeChat?.id;


    if (
      isHome ||
      !targetChatId
    ) {
      targetChatId =
        prepareHomeChat();
    }


    setIsUploading(true);


    try {
      const document =
        await uploadDocument(
          file,
          targetChatId
        );

      setUploadedDocuments(
        (
          currentDocuments
        ) => [
          document,
          ...currentDocuments,
        ]
      );

      showToast(
        `${document.filename} is ready.`,
        "success",
        3200
      );

    } catch (error) {
      showToast(
        error.message ||
          "Nova could not process this PDF.",
        "error"
      );

    } finally {
      setIsUploading(false);
    }
  }


  function handleDeleteDocument(
    document
  ) {
    if (
      !activeChat ||
      isHome ||
      isLoading ||
      isUploading ||
      deletingDocumentId
    ) {
      return;
    }


    setConfirmation({
      title: "Remove document?",

      message:
        `"${document.filename}" will be removed from this conversation.`,

      confirmLabel:
        "Remove",

      action: async () => {
        setDeletingDocumentId(
          document.id
        );

        try {
          await deleteDocument(
            activeChat.id,
            document.id
          );

          setUploadedDocuments(
            (
              currentDocuments
            ) =>
              currentDocuments.filter(
                (
                  currentDocument
                ) =>
                  currentDocument.id !==
                  document.id
              )
          );

          showToast(
            "Document removed.",
            "success",
            3000
          );

        } catch (error) {
          showToast(
            error.message ||
              "Could not remove the document.",
            "error"
          );

        } finally {
          setDeletingDocumentId(
            null
          );
        }
      },
    });
  }


  function handleHome() {
    if (interfaceLocked) {
      return;
    }

    setIsHome(true);

    setUploadedDocuments([]);

    closeSidebarOnMobile();
  }


  function handleNewChat() {
    if (interfaceLocked) {
      return;
    }


    const emptyExistingChat =
      chats.find(
        (chat) =>
          chat.messages.length === 0
      );


    if (emptyExistingChat) {
      setActiveChatId(
        emptyExistingChat.id
      );

      setIsHome(false);

      closeSidebarOnMobile();

      return;
    }


    const newChat =
      createNewChat();


    setChats(
      (currentChats) => [
        newChat,
        ...currentChats,
      ]
    );


    setActiveChatId(
      newChat.id
    );

    setIsHome(false);

    closeSidebarOnMobile();
  }


  function handleSelectChat(
    chatId
  ) {
    if (interfaceLocked) {
      return;
    }

    setActiveChatId(chatId);

    setIsHome(false);

    closeSidebarOnMobile();
  }


  function handleRenameChat(
    chatId
  ) {
    if (interfaceLocked) {
      return;
    }


    const chat =
      chats.find(
        (
          currentChat
        ) =>
          currentChat.id ===
          chatId
      );


    if (!chat) {
      return;
    }


    const newTitle =
      window.prompt(
        "Rename conversation:",
        chat.title
      );


    const trimmedTitle =
      newTitle?.trim();


    if (!trimmedTitle) {
      return;
    }


    setChats(
      (currentChats) =>
        currentChats.map(
          (
            currentChat
          ) =>
            currentChat.id ===
            chatId

              ? {
                  ...currentChat,

                  title:
                    trimmedTitle,

                  updatedAt:
                    new Date()
                      .toISOString(),
                }

              : currentChat
        )
    );
  }


  function handleDeleteChat(
    chatId
  ) {
    if (interfaceLocked) {
      return;
    }


    const chat =
      chats.find(
        (
          currentChat
        ) =>
          currentChat.id ===
          chatId
      );


    if (!chat) {
      return;
    }


    setConfirmation({
      title:
        "Delete conversation?",

      message:
        `"${chat.title}" and its stored Nova context will be deleted.`,

      confirmLabel:
        "Delete",

      action: async () => {
        try {
          await deleteConversation(
            chatId
          );

        } catch (error) {
          showToast(
            error.message ||
              "Could not delete the conversation.",
            "error"
          );

          return;
        }


        const remainingChats =
          chats.filter(
            (
              currentChat
            ) =>
              currentChat.id !==
              chatId
          );


        if (
          remainingChats.length === 0
        ) {
          const newChat =
            createNewChat();

          setChats([
            newChat,
          ]);

          setActiveChatId(
            newChat.id
          );

          setIsHome(true);

          setUploadedDocuments([]);

          showToast(
            "Conversation deleted.",
            "success",
            3000
          );

          return;
        }


        setChats(
          remainingChats
        );


        if (
          activeChatId === chatId
        ) {
          setActiveChatId(
            remainingChats[0].id
          );

          setIsHome(true);

          setUploadedDocuments([]);
        }


        showToast(
          "Conversation deleted.",
          "success",
          3000
        );
      },
    });
  }


  async function confirmCurrentAction() {
    const action =
      confirmation?.action;

    setConfirmation(null);

    if (!action) {
      return;
    }

    await action();
  }


  function getToastIcon() {
    if (
      toast?.type ===
      "success"
    ) {
      return (
        <CheckCircle2
          size={19}
        />
      );
    }

    if (
      toast?.type ===
      "warning"
    ) {
      return (
        <AlertCircle
          size={19}
        />
      );
    }

    if (
      toast?.type ===
      "info"
    ) {
      return (
        <Info
          size={19}
        />
      );
    }

    return (
      <AlertCircle
        size={19}
      />
    );
  }


  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      const { error } = await signOut();

      if (error) {
        showToast(error.message || "Could not log out. Please try again.");
        setIsSigningOut(false);
      }
    } catch (error) {
      showToast(error?.message || "Could not log out. Please try again.");
      setIsSigningOut(false);
    }
  }


  return (
    <div className="app-shell">

      {toast && (
        <div
          className={
            `nova-toast nova-toast-${toast.type}`
          }
          role="status"
          aria-live="polite"
        >
          <div
            className="nova-toast-icon"
          >
            {getToastIcon()}
          </div>

          <div
            className="nova-toast-content"
          >
            <strong>
              {toast.type === "success"
                ? "Done"
                : toast.type === "warning"
                  ? "Heads up"
                  : toast.type === "info"
                    ? "Nova"
                    : "Something went wrong"}
            </strong>

            <span>
              {toast.message}
            </span>
          </div>

          <button
            className="nova-toast-close"
            onClick={hideToast}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}


      {confirmation && (
        <div
          className="nova-modal-backdrop"
          onMouseDown={() =>
            setConfirmation(null)
          }
        >
          <div
            className="nova-confirm-modal"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="nova-confirm-title"
          >
            <div
              className="nova-confirm-icon"
            >
              <AlertCircle
                size={22}
              />
            </div>

            <div
              className="nova-confirm-copy"
            >
              <h3
                id="nova-confirm-title"
              >
                {confirmation.title}
              </h3>

              <p>
                {confirmation.message}
              </p>
            </div>

            <div
              className="nova-confirm-actions"
            >
              <button
                className="nova-confirm-cancel"
                onClick={() =>
                  setConfirmation(null)
                }
              >
                Cancel
              </button>

              <button
                className="nova-confirm-danger"
                onClick={
                  confirmCurrentAction
                }
              >
                {
                  confirmation
                    .confirmLabel
                }
              </button>
            </div>
          </div>
        </div>
      )}


      <div
        className={
          `sidebar-wrapper ${
            sidebarOpen
              ? "open"
              : "closed"
          }`
        }
      >
        <Sidebar
          chats={chats}

          activeChatId={
            isHome
              ? null
              : activeChatId
          }

          onHome={
            handleHome
          }

          onNewChat={
            handleNewChat
          }

          onSelectChat={
            handleSelectChat
          }

          onRenameChat={
            handleRenameChat
          }

          onDeleteChat={
            handleDeleteChat
          }

          onClose={() =>
            setSidebarOpen(false)
          }

          isLoading={
            interfaceLocked
          }

          userEmail={
            user?.email || ""
          }

          onSignOut={
            handleSignOut
          }

          isSigningOut={
            isSigningOut
          }
        />
      </div>


      {sidebarOpen && (
        <button
          className="sidebar-backdrop"

          onClick={() =>
            setSidebarOpen(false)
          }

          aria-label="Close sidebar"
        />
      )}


      <main className="main-panel">

        <header className="topbar">

          <button
            className="icon-button"

            onClick={() =>
              setSidebarOpen(
                (current) =>
                  !current
              )
            }

            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? (
              <PanelLeftClose
                size={20}
              />
            ) : (
              <Menu
                size={20}
              />
            )}
          </button>


          <button
            className="topbar-title topbar-home-button"

            onClick={
              handleHome
            }

            disabled={
              interfaceLocked
            }

            aria-label="Go to Nova home"
          >
            {isHome ? (
              <NovaLogo size="sm" />
            ) : (
              <span>{activeChat?.title || "Nova"}</span>
            )}
          </button>


          <div className="model-badge">
            <span />
            Nemotron 3 Ultra
          </div>

        </header>


        <section
          ref={
            conversationAreaRef
          }

          className="conversation-area"
        >

          {isHome ? (
            <WelcomeScreen
              onSuggestionClick={
                handleSend
              }
            />

          ) : messages.length === 0 ? (
            <WelcomeScreen
              onSuggestionClick={
                handleSend
              }
            />

          ) : (
            <div className="messages-container">

              {messages.map(
                (
                  message
                ) => (
                  <MessageBubble
                    key={
                      message.id
                    }

                    message={
                      message
                    }
                  />
                )
              )}


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
          onSend={
            handleSend
          }

          onStop={
            handleStopGeneration
          }

          onUploadDocument={
            handleUploadDocument
          }

          onDeleteDocument={
            handleDeleteDocument
          }

          uploadedDocuments={
            isHome
              ? []
              : uploadedDocuments
          }

          isLoading={
            isLoading
          }

          isUploading={
            isUploading
          }

          deletingDocumentId={
            deletingDocumentId
          }

          isLoadingDocuments={
            isLoadingDocuments
          }
        />

      </main>
    </div>
  );
}


function App() {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (loading) {
    return (
      <div className="nova-auth">
        <div className="nova-auth-shell">
          <div className="nova-auth-brand">
            <NovaLogo size="md" />
          </div>
        </div>
      </div>
    );
  }

  if (user) {
    return <NovaWorkspace />;
  }

  if (showAuth) {
    return <AuthScreen />;
  }

  return (
    <LandingPage
      onEnterNova={() => setShowAuth(true)}
      onSignIn={() => setShowAuth(true)}
    />
  );
}

export default App;