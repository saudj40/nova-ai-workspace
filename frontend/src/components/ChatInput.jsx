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
  uploadedDocument,
  isLoading,
  isUploading,
}) {
  const [input, setInput] =
    useState("");

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);


  useEffect(() => {
    const textarea =
      textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";

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
      isLoading
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


  function handleFileChange(event) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    onUploadDocument(file);

    event.target.value = "";
  }


  return (
    <div className="input-area">
      {uploadedDocument && (
        <div className="document-pill">
          <FileText size={15} />

          <span>
            {uploadedDocument.filename}
          </span>

          <small>
            {uploadedDocument.page_count}
            {" "}pages
          </small>

          <X
            className="document-pill-close"
            size={14}
          />
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
          ease: [0.22, 1, 0.36, 1],
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
            fileInputRef.current?.click()
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
            <Paperclip size={17} />
          )}
        </button>

        <input
          ref={fileInputRef}
          className="hidden-file-input"
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
        />

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(event) =>
            setInput(
              event.target.value
            )
          }
          onKeyDown={handleKeyDown}
          placeholder={
            isUploading
              ? "Processing your PDF..."
              : isLoading
                ? "Nova is responding..."
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
              <span>Enter</span>
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
              onClick={submitMessage}
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
        Upload a PDF or ask Nova
        anything.
      </p>
    </div>
  );
}


export default ChatInput;