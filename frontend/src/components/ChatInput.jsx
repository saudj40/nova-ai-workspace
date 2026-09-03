import { motion } from "framer-motion";

import {
  ArrowUp,
  CornerDownLeft,
  FileText,
  LoaderCircle,
  Paperclip,
  Sparkles,
  Square,
  X,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";


function ChatInput({
  onSend,
  onStop,
  onUploadDocument,
  onDeleteDocument,
  uploadedDocuments,
  isLoading,
  isUploading,
  deletingDocumentId,
}) {
  const [input, setInput] =
    useState("");

  const textareaRef =
    useRef(null);

  const fileInputRef =
    useRef(null);


  useEffect(() => {
    const textarea =
      textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height =
      "auto";

    textarea.style.height =
      `${Math.min(
        textarea.scrollHeight,
        170
      )}px`;
  }, [input]);


  function submitMessage() {
    const trimmedMessage =
      input.trim();

    if (
      !trimmedMessage ||
      isLoading ||
      isUploading
    ) {
      return;
    }

    onSend(trimmedMessage);
    setInput("");
  }


  function handleKeyDown(event) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      submitMessage();
    }
  }


  function handleFileChange(
    event
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    onUploadDocument(file);

    event.target.value = "";
  }


  const hasDocuments =
    uploadedDocuments.length > 0;


  return (
    <div className="input-area">
      {hasDocuments && (
        <div className="document-list">
          {uploadedDocuments.map(
            (document) => (
              <div
                key={document.id}
                className="document-pill"
              >
                <FileText
                  size={15}
                />

                <span>
                  {document.filename}
                </span>

                <small>
                  {
                    document.page_count
                  }{" "}
                  {document.page_count === 1
                    ? "page"
                    : "pages"}
                </small>

                <button
                  className="document-remove-button"
                  onClick={() =>
                    onDeleteDocument(
                      document
                    )
                  }
                  disabled={
                    isLoading ||
                    isUploading ||
                    deletingDocumentId ===
                      document.id
                  }
                  aria-label={
                    `Remove ${document.filename}`
                  }
                  title="Remove document"
                >
                  {deletingDocumentId ===
                  document.id ? (
                    <LoaderCircle
                      className="spinner"
                      size={14}
                    />
                  ) : (
                    <X size={14} />
                  )}
                </button>
              </div>
            )
          )}
        </div>
      )}

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
          ease: [
            0.22,
            1,
            0.36,
            1,
          ],
        }}
      >
        <div className="composer-brand">
          <Sparkles
            size={17}
            strokeWidth={1.8}
          />
        </div>

        <button
          className="attachment-button"
          onClick={() =>
            fileInputRef.current
              ?.click()
          }
          disabled={
            isLoading ||
            isUploading
          }
          aria-label="Upload PDF"
          title="Upload PDF"
        >
          {isUploading ? (
            <LoaderCircle
              className="spinner"
              size={17}
            />
          ) : (
            <Paperclip
              size={17}
            />
          )}
        </button>

        <input
          ref={fileInputRef}
          className="hidden-file-input"
          type="file"
          accept=".pdf,application/pdf"
          onChange={
            handleFileChange
          }
        />

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(event) =>
            setInput(
              event.target.value
            )
          }
          onKeyDown={
            handleKeyDown
          }
          placeholder={
            isUploading
              ? "Processing your PDF..."
              : isLoading
                ? "Nova is responding..."
                : hasDocuments
                  ? "Ask Nova about your documents..."
                  : "Ask Nova anything..."
          }
          rows="1"
          disabled={
            isLoading ||
            isUploading
          }
          aria-label="Message Nova"
        />

        <div className="composer-actions">
          {!isLoading && (
            <div className="keyboard-hint">
              <CornerDownLeft
                size={13}
              />

              <span>
                Enter
              </span>
            </div>
          )}

          {isLoading ? (
            <motion.button
              className="send-button stop-button"
              onClick={onStop}
              aria-label="Stop generation"
              title="Stop generation"
              whileHover={{
                scale: 1.04,
              }}
              whileTap={{
                scale: 0.92,
              }}
            >
              <Square
                size={15}
                strokeWidth={2.4}
                fill="currentColor"
              />
            </motion.button>
          ) : (
            <motion.button
              className="send-button"
              onClick={
                submitMessage
              }
              disabled={
                !input.trim() ||
                isUploading
              }
              aria-label="Send message"
              whileHover={
                input.trim()
                  ? {
                      scale: 1.04,
                    }
                  : undefined
              }
              whileTap={
                input.trim()
                  ? {
                      scale: 0.94,
                    }
                  : undefined
              }
            >
              <ArrowUp
                size={18}
                strokeWidth={2.2}
              />
            </motion.button>
          )}
        </div>
      </motion.div>

      <p className="input-hint">
        {hasDocuments
          ? "Nova can use the uploaded documents as context."
          : "Upload a PDF or ask Nova anything."}
      </p>
    </div>
  );
}


export default ChatInput;