import {
  useEffect,
  useRef,
  useState,
} from "react";

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
  deleteDocument,
  getDocuments,
  streamMessage,
  uploadDocument,
} from "./services/api";

import "./App.css";


const STORAGE_KEY =
  "nova-chats";

const ACTIVE_CHAT_KEY =
  "nova-active-chat";


function createNewChat() {
  const now =
    new Date().toISOString();

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


function App() {

  const initialChatsRef =
    useRef(loadChats());

  const conversationAreaRef =
    useRef(null);

  const abortControllerRef =
    useRef(null);

  const documentLoadRequestRef =
    useRef(0);


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


  /*
   * Home is intentionally separate
   * from conversation state.
   *
   * Nova always opens on Home,
   * while previous chats remain saved.
   */
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
    sidebarOpen,
    setSidebarOpen,
  ] = useState(true);


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


  /*
   * Load documents only when the
   * user is actually inside a chat.
   */
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
    };

  }, []);


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


  /*
   * Finds an unused empty chat,
   * otherwise creates a new one.
   *
   * Used when sending/uploading
   * directly from Home.
   */
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
      id: crypto.randomUUID(),
      role: "user",
      content:
        trimmedMessage,
    };


    const assistantMessageId =
      crypto.randomUUID();


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
                        `**Connection error:** ${error.message}`,
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

      window.alert(
        "Please select a PDF file."
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

    } catch (error) {

      window.alert(
        error.message
      );

    } finally {

      setIsUploading(false);
    }
  }


  async function handleDeleteDocument(
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


    const shouldDelete =
      window.confirm(
        `Remove "${document.filename}" from this conversation?`
      );


    if (!shouldDelete) {
      return;
    }


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

    } catch (error) {

      window.alert(
        error.message
      );

    } finally {

      setDeletingDocumentId(
        null
      );
    }
  }


  function handleHome() {

    if (interfaceLocked) {
      return;
    }


    setIsHome(true);

    setUploadedDocuments([]);
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
  }


  function handleSelectChat(
    chatId
  ) {

    if (interfaceLocked) {
      return;
    }


    setActiveChatId(chatId);

    setIsHome(false);
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


  async function handleDeleteChat(
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


    const shouldDelete =
      window.confirm(
        `Delete "${chat.title}"?`
      );


    if (!shouldDelete) {
      return;
    }


    try {

      await deleteConversation(
        chatId
      );

    } catch (error) {

      window.alert(
        error.message
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


      /*
       * If the user deleted the chat
       * they were viewing, return Home
       * instead of unexpectedly opening
       * another conversation.
       */
      setIsHome(true);

      setUploadedDocuments([]);
    }
  }


  return (
    <div className="app-shell">

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

          isLoading={
            interfaceLocked
          }
        />

      </div>


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

            <Sparkles
              size={17}
            />

            <span>
              {isHome
                ? "Nova"
                : activeChat
                    ?.title ||
                  "Nova"}
            </span>

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
            isUploading ||
            isLoadingDocuments
          }

          deletingDocumentId={
            deletingDocumentId
          }
        />

      </main>

    </div>
  );
}


export default App;