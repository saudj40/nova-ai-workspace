import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  ArrowRight,
  ChevronDown,
  FileText,
  LockKeyhole,
  MessageSquareText,
  NotebookText,
  Sparkles,
  LoaderCircle,
} from "lucide-react";

import { streamDemoMessage } from "../services/api";
import NovaLogo from "./NovaLogo";

import "./LandingPage.css";

const DEMO_DATA = {
  sources: {
    research: {
      id: "research",
      title: "Research notes",
      type: "document",
      meta: "12 pages · indexed",
      excerpt:
        "Users repeatedly described continuity as more valuable than adding another standalone AI feature.",
    },
    launch: {
      id: "launch",
      title: "Launch strategy",
      type: "thread",
      meta: "18 messages",
      excerpt:
        "Position around continuity, not features. One workspace, many sources.",
    },
    client: {
      id: "client",
      title: "Client call",
      type: "note",
      meta: "42 min · Sep 28",
      excerpt:
        "Client said they re-explain project context at the start of every AI session.",
    },
  },
};

const SOURCE_ORDER = ["research", "launch", "client"];

const MODES = {
  ask: {
    label: "Ask",
    placeholder: "Ask Nova anything…",
  },
  search: {
    label: "Search",
    placeholder: "Search the selected context…",
  },
  compare: {
    label: "Compare",
    placeholder: "Ask Nova to compare the selected sources…",
  },
};

const MODE_ORDER = ["ask", "search", "compare"];

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);

    sync();
    media.addEventListener?.("change", sync);

    return () => media.removeEventListener?.("change", sync);
  }, []);

  return reduced;
}

function NovaMark() {
  return <NovaLogo size="md" />;
}

function SourceIcon({ type }) {
  if (type === "thread") {
    return <MessageSquareText size={19} strokeWidth={1.55} />;
  }

  if (type === "note") {
    return <NotebookText size={19} strokeWidth={1.55} />;
  }

  return <FileText size={19} strokeWidth={1.55} />;
}

function SourceCard({ source, selected, reading, onToggle }) {
  return (
    <button
      type="button"
      className={`thread-source-card ${selected ? "is-selected" : ""}`}
      aria-pressed={selected}
      onClick={onToggle}
    >
      <span className="thread-source-icon" aria-hidden="true">
        <SourceIcon type={source.type} />
      </span>

      <span className="thread-source-copy">
        <strong>{source.title}</strong>
        <span>{source.meta}</span>
      </span>

      {reading ? (
        <span className="thread-reading-dot" aria-label="Reading source" />
      ) : (
        <span className={`thread-check ${selected ? "is-selected" : ""}`}>
          {selected && (
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="m3.5 8.2 2.5 2.4 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
      )}
    </button>
  );
}

function ThreadPipeline({ selectedCount, stage, usesContext }) {
  const rows = usesContext
    ? [
        {
          id: "sources",
          label: `Sources selected (${selectedCount})`,
          active: selectedCount > 0,
        },
        {
          id: "reading",
          label:
            stage === "reading"
              ? `Reading ${selectedCount} ${
                  selectedCount === 1 ? "source" : "sources"
                }...`
              : "Reading",
          active: ["reading", "synthesizing", "answered"].includes(stage),
        },
        {
          id: "synthesizing",
          label: stage === "synthesizing" ? "Synthesizing..." : "Synthesizing",
          active: ["synthesizing", "answered"].includes(stage),
        },
        {
          id: "answered",
          label: "Answered",
          active: stage === "answered",
        },
      ]
    : [
        {
          id: "received",
          label: "Question received",
          active: ["reading", "synthesizing", "answered"].includes(stage),
        },
        {
          id: "thinking",
          label: stage === "synthesizing" ? "Thinking..." : "Thinking",
          active: ["synthesizing", "answered"].includes(stage),
        },
        {
          id: "answered",
          label: "Answered",
          active: stage === "answered",
        },
      ];

  return (
    <div className="thread-pipeline">
      <span className="thread-pipeline-line" aria-hidden="true" />

      {rows.map((row) => (
        <div className="thread-pipeline-row" key={row.id}>
          <span
            className={`thread-pipeline-dot ${row.active ? "is-active" : ""}`}
            aria-hidden="true"
          />
          <span className={row.active ? "is-active" : ""}>{row.label}</span>
        </div>
      ))}
    </div>
  );
}

function waitFor(ms, signal) {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      signal?.removeEventListener("abort", handleAbort);
    };

    const timer = window.setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const handleAbort = () => {
      window.clearTimeout(timer);
      cleanup();
      reject(new DOMException("Generation stopped", "AbortError"));
    };

    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

function buildPrompt(mode, prompt) {
  if (mode === "search") {
    return [
      "Answer the user's question using the selected context.",
      "If the selected context does not support a claim, say so instead of inventing it.",
      "Cite every source you actually use inline as [1], [2], or [3].",
      "",
      `Question: ${prompt}`,
    ].join("\n");
  }

  if (mode === "compare") {
    return [
      "Compare the selected sources in relation to the user's question.",
      "Be specific about agreements, differences, and what each source contributes.",
      "Cite every source you actually use inline as [1], [2], or [3].",
      "",
      `Question: ${prompt}`,
    ].join("\n");
  }

  return prompt;
}

function extractUsedSources(text, sourceIds) {
  const seen = new Set();
  const citationPattern = /\[(\d+)\]/g;
  let match;

  while ((match = citationPattern.exec(text)) !== null) {
    const sourceId = sourceIds[Number(match[1]) - 1];
    if (sourceId) {
      seen.add(sourceId);
    }
  }

  return sourceIds.filter((id) => seen.has(id));
}

function getFollowUps(mode, question, answer, usedSourceIds) {
  const normalizedQuestion = question.toLowerCase();
  const normalizedAnswer = answer.toLowerCase();

  if (
    normalizedQuestion.includes("yourself") ||
    normalizedQuestion.includes("who are you") ||
    normalizedQuestion.includes("what can you do")
  ) {
    return [
      "What can you help me build?",
      "How do you work with documents and context?",
      "What should I use Nova for first?",
    ];
  }

  if (mode === "compare") {
    return [
      "Where do these sources disagree most?",
      "What do they both imply for the next decision?",
      "Which source should carry more weight, and why?",
    ];
  }

  if (mode === "search") {
    return [
      "What evidence in the selected context supports this?",
      "What important detail might I be missing?",
      "What should I do with this information next?",
    ];
  }

  const technical =
    /(code|python|api|backend|frontend|database|model|ai|ml|bug|error|deploy|architecture)/.test(
      `${normalizedQuestion} ${normalizedAnswer}`
    );

  if (technical) {
    return [
      "Can you show me a concrete implementation?",
      "What are the main trade-offs?",
      "What should I test first?",
    ];
  }

  const career =
    /(career|job|interview|resume|cv|client|freelance|salary|role)/.test(
      `${normalizedQuestion} ${normalizedAnswer}`
    );

  if (career) {
    return [
      "What should I prioritize first?",
      "What would make the biggest difference?",
      "Can you turn this into a short action plan?",
    ];
  }

  if (usedSourceIds.length > 0) {
    return [
      "Which source matters most here, and why?",
      "What is the strongest evidence behind this?",
      "What should I do next based on this?",
    ];
  }

  return [
    "Can you give me a concrete example?",
    "What are the main trade-offs?",
    "What should I do next?",
  ];
}

export default function LandingPage({ onEnterNova, onSignIn }) {
  const reducedMotion = useReducedMotion();
  const [selectedIds, setSelectedIds] = useState([...SOURCE_ORDER]);
  const [mode, setMode] = useState("ask");
  const [question, setQuestion] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [readingIndex, setReadingIndex] = useState(-1);
  const [pipelineStage, setPipelineStage] = useState("idle");
  const [pipelineUsesContext, setPipelineUsesContext] = useState(false);
  const [status, setStatus] = useState("");
  const [selectionDirty, setSelectionDirty] = useState(false);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [hoveredSource, setHoveredSource] = useState(null);
  const [pinnedSource, setPinnedSource] = useState(null);

  const [answerText, setAnswerText] = useState("");
  const [answerSourceIds, setAnswerSourceIds] = useState([]);
  const [answerContextSourceIds, setAnswerContextSourceIds] = useState([]);
  const [answerError, setAnswerError] = useState("");
  const [hasAnswer, setHasAnswer] = useState(false);
  const [answerMode, setAnswerMode] = useState("ask");
  const [answerQuestion, setAnswerQuestion] = useState("");
  const [answerUsedContext, setAnswerUsedContext] = useState(false);

  const timersRef = useRef([]);
  const abortControllerRef = useRef(null);
  const composerInputRef = useRef(null);

  useEffect(() => {
    const input = composerInputRef.current;
    if (!input) {
      return;
    }

    input.style.height = "auto";
    input.style.height = `${Math.min(Math.max(input.scrollHeight, 60), 140)}px`;
  }, [question]);

  const clearTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  };

  const cancelCurrentRun = () => {
    clearTimers();

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  useEffect(() => () => cancelCurrentRun(), []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setPinnedSource(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const inspectionSourceId =
    pinnedSource || hoveredSource || answerSourceIds[0] || null;

  const inspectionSource = inspectionSourceId
    ? DEMO_DATA.sources[inspectionSourceId]
    : null;

  const selectedSourceIds = useMemo(
    () => SOURCE_ORDER.filter((id) => selectedIds.includes(id)),
    [selectedIds]
  );

  const modeNeedsSources = mode !== "ask";
  const modeHasEnoughSources =
    mode === "ask" ||
    (mode === "search" && selectedSourceIds.length >= 1) ||
    (mode === "compare" && selectedSourceIds.length >= 2);

  const followUps = useMemo(
    () =>
      !isRunning && !answerError && answerText
        ? getFollowUps(
            answerMode,
            answerQuestion,
            answerText,
            answerSourceIds
          )
        : [],
    [
      answerMode,
      answerError,
      answerQuestion,
      answerSourceIds,
      answerText,
      isRunning,
    ]
  );

  const toggleSource = (id) => {
    cancelCurrentRun();

    setSelectedIds((current) => {
      const next = current.includes(id)
        ? current.filter((sourceId) => sourceId !== id)
        : [...current, id];

      return SOURCE_ORDER.filter((sourceId) => next.includes(sourceId));
    });

    setIsRunning(false);
    setReadingIndex(-1);

    if (hasAnswer && answerUsedContext) {
      setPipelineStage("idle");
      setStatus("Selection changed");
      setSelectionDirty(true);
    } else if (!hasAnswer) {
      setPipelineStage("idle");
      setStatus("");
    }
  };

  const changeMode = (nextMode) => {
    if (isRunning || nextMode === mode) {
      return;
    }

    setMode(nextMode);

    if (!hasAnswer) {
      setPipelineUsesContext(nextMode !== "ask");
      setPipelineStage("idle");
      setStatus("");
    }
  };

  const runAnswer = async (
    modeKey = mode,
    displayQuestion = question,
    promptOverride = null
  ) => {
    const visiblePrompt = displayQuestion.trim();
    const usesContext = modeKey !== "ask";
    const sourceIdsForRun = SOURCE_ORDER.filter((id) => selectedIds.includes(id));
    const enoughSources =
      modeKey === "ask" ||
      (modeKey === "search" && sourceIdsForRun.length >= 1) ||
      (modeKey === "compare" && sourceIdsForRun.length >= 2);

    if (!visiblePrompt || isRunning || !enoughSources) {
      return;
    }

    cancelCurrentRun();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setMode(modeKey);
    setQuestion(visiblePrompt);
    setIsRunning(true);
    setHasAnswer(true);
    setSelectionDirty(false);
    setAnswerError("");
    setAnswerText("");
    setAnswerSourceIds([]);
    setAnswerContextSourceIds(usesContext ? sourceIdsForRun : []);
    setAnswerMode(modeKey);
    setAnswerQuestion(visiblePrompt);
    setAnswerUsedContext(usesContext);
    setReadingIndex(-1);
    setPipelineUsesContext(usesContext);

    setPipelineStage("reading");

    if (usesContext) {
      setStatus(
        `Reading ${sourceIdsForRun.length} ${
          sourceIdsForRun.length === 1 ? "source" : "sources"
        }...`
      );
    } else {
      setStatus("Question received");
    }

    if (usesContext) {
      sourceIdsForRun.forEach((_, index) => {
        const timer = window.setTimeout(() => {
          setReadingIndex(index);
        }, reducedMotion ? 0 : index * 120);
        timersRef.current.push(timer);
      });
    }

    const readingDuration = reducedMotion
      ? 0
      : usesContext
        ? sourceIdsForRun.length * 120 + 180
        : 160;

    try {
      if (readingDuration > 0) {
        await waitFor(readingDuration, controller.signal);
      }

      if (controller.signal.aborted) {
        return;
      }

      setPipelineStage("synthesizing");
      setStatus(usesContext ? "Synthesizing..." : "Thinking...");

      const demoContext = usesContext
        ? sourceIdsForRun.map((id, index) => {
            const source = DEMO_DATA.sources[id];

            return {
              title: `[${index + 1}] ${source.title}`,
              excerpt: source.excerpt,
            };
          })
        : [];

      const modelPrompt =
        promptOverride || buildPrompt(modeKey, visiblePrompt);

      let completedText = "";

      await streamDemoMessage(
        modelPrompt,
        demoContext,
        (chunk) => {
          completedText += chunk;
          setAnswerText((current) => current + chunk);
        },
        controller.signal
      );

      if (controller.signal.aborted) {
        return;
      }

      const usedSources = usesContext
        ? extractUsedSources(completedText, sourceIdsForRun)
        : [];

      setAnswerSourceIds(usedSources);
      setPipelineStage("answered");
      setStatus("Answered");
      setSelectionDirty(false);
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      const message =
        error?.message || "Nova could not answer this request. Please try again.";

      setAnswerError(message);
      setPipelineStage("idle");
      setStatus("Could not answer");
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }

      setIsRunning(false);
      setReadingIndex(-1);
    }
  };

  const runFollowUp = (followUp) => {
    setQuestion(followUp);
    runAnswer(answerMode, followUp);
  };

  const runAction = (action) => {
    if (!answerText || isRunning) {
      return;
    }

    if (action === "summarize") {
      const displayQuestion = "Summarize this answer";
      const prompt = [
        "Summarize the previous answer into a concise, useful version.",
        "Keep the key conclusions and remove repetition.",
        "",
        answerText,
      ].join("\n");

      setMode("ask");
      runAnswer("ask", displayQuestion, prompt);
      return;
    }

    if (action === "compare") {
      if (selectedSourceIds.length < 2) {
        setMode("compare");
        return;
      }

      const displayQuestion = "Compare the selected sources";
      const prompt = [
        "Compare the selected sources in relation to the previous question and answer.",
        "Call out agreements, disagreements, and which source contributes what.",
        "Cite every source you actually use inline as [1], [2], or [3].",
        "",
        `Previous question: ${answerQuestion}`,
        `Previous answer: ${answerText}`,
      ].join("\n");

      setMode("compare");
      runAnswer("compare", displayQuestion, prompt);
      return;
    }

    const displayQuestion = "Turn this into a plan";
    const prompt = [
      "Turn the previous answer into a practical action plan.",
      "Use clear priorities, concrete next steps, and a sensible sequence.",
      "",
      answerText,
    ].join("\n");

    setMode("ask");
    runAnswer("ask", displayQuestion, prompt);
  };

  const handleComposerSubmit = (event) => {
    event.preventDefault();
    const currentValue = composerInputRef.current?.value ?? question;
    runAnswer(mode, currentValue);
  };

  const handleComposerKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent?.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const sourceCards = useMemo(
    () =>
      SOURCE_ORDER.map((id) => {
        const source = DEMO_DATA.sources[id];
        return (
          <SourceCard
            key={id}
            source={source}
            selected={selectedIds.includes(id)}
            reading={
              isRunning &&
              pipelineUsesContext &&
              selectedSourceIds[readingIndex] === id
            }
            onToggle={() => toggleSource(id)}
          />
        );
      }),
    [
      isRunning,
      pipelineUsesContext,
      readingIndex,
      selectedIds,
      selectedSourceIds,
    ]
  );

  return (
    <div className="thread-page">
      <div className="thread-noise" aria-hidden="true" />

      <header className="thread-header">
        <div className="thread-header-inner">
          <NovaMark />

          <div className="thread-header-actions">
            <div className="thread-private-label">
              <LockKeyhole size={16} strokeWidth={1.55} />
              <span>Private by design</span>
            </div>

            <button type="button" className="thread-signin" onClick={onSignIn}>
              Sign in
            </button>

            <button type="button" className="thread-enter" onClick={onEnterNova}>
              Enter Nova
            </button>
          </div>
        </div>
      </header>

      <main className="thread-main">
        <section className="thread-mobile-library" aria-label="Context library">
          <div className="thread-mobile-library-head">
            <h2>Context library</h2>
            <span>{selectedIds.length} active</span>
          </div>

          <div className="thread-mobile-source-scroller">{sourceCards}</div>
        </section>

        <section className="thread-shell">
          <aside className="thread-library-panel">
            <div className="thread-panel-heading">
              <h2>Context library</h2>
              <span>{selectedIds.length}/3</span>
            </div>

            <p className="thread-panel-intro">
              Choose what Nova should carry into the question.
            </p>

            <div className="thread-source-list">{sourceCards}</div>
          </aside>

          <section className="thread-center">
            <div className="thread-warm-glow" aria-hidden="true" />

            <div className="thread-center-inner">
              <div className="thread-demo-status-row" aria-live="polite">
                {status ? <span>{status}</span> : null}
              </div>

              <h1>
                Your work, already in <em>context.</em>
              </h1>

              <p className="thread-subline">
                Ask Nova anything. Bring conversations, documents, and decisions
                into one focused answer.
              </p>

              <div className="thread-composer">
                <div className="thread-mode-selector" aria-label="Question mode">
                  {MODE_ORDER.map((modeKey) => (
                    <button
                      type="button"
                      key={modeKey}
                      className={mode === modeKey ? "is-active" : ""}
                      aria-pressed={mode === modeKey}
                      disabled={isRunning}
                      onClick={() => changeMode(modeKey)}
                    >
                      {MODES[modeKey].label}
                    </button>
                  ))}
                </div>

                <form className="thread-composer-input" onSubmit={handleComposerSubmit}>
                  <span className="thread-composer-spark" aria-hidden="true">
                    <Sparkles size={20} strokeWidth={1.45} />
                  </span>

                  <textarea
                    ref={composerInputRef}
                    rows={1}
                    aria-label="Ask Nova"
                    value={question}
                    placeholder={MODES[mode].placeholder}
                    disabled={isRunning}
                    onChange={(event) => setQuestion(event.target.value)}
                    onKeyDown={handleComposerKeyDown}
                  />

                  <button
                    type="submit"
                    className="thread-ask"
                    aria-label={isRunning ? "Nova is working" : "Send to Nova"}
                    title={isRunning ? "Nova is working" : "Send"}
                    disabled={
                      isRunning ||
                      !modeHasEnoughSources ||
                      question.trim().length === 0
                    }
                  >
                    {isRunning ? (
                      <LoaderCircle className="thread-send-spinner" size={19} strokeWidth={1.7} />
                    ) : (
                      <ArrowRight size={19} strokeWidth={1.7} />
                    )}
                  </button>
                </form>
              </div>

              {modeNeedsSources && !modeHasEnoughSources && (
                <p className="thread-empty-hint">
                  {mode === "compare"
                    ? "Select at least two sources to compare."
                    : "Select at least one source to search."}
                </p>
              )}

              {hasAnswer && (
                <div
                  className={`thread-answer ${selectionDirty ? "is-stale" : ""}`}
                  aria-live="polite"
                >
                  <h2>Answer</h2>

                  {answerError ? (
                    <p className="thread-answer-error">{answerError}</p>
                  ) : (
                    <div className="thread-answer-body thread-answer-live">
                      {answerText ? (
                        <ReactMarkdown>{answerText}</ReactMarkdown>
                      ) : isRunning ? (
                        " "
                      ) : (
                        "Nova did not return a response."
                      )}
                    </div>
                  )}

                  {!answerError && answerText && answerSourceIds.length > 0 && (
                    <div className="thread-used">
                      <h2>Sources</h2>
                      <div className="thread-used-row">
                        {answerSourceIds.map((id) => (
                          <button
                            type="button"
                            key={id}
                            onMouseEnter={() => setHoveredSource(id)}
                            onMouseLeave={() => setHoveredSource(null)}
                            onFocus={() => setHoveredSource(id)}
                            onBlur={() => setHoveredSource(null)}
                            onClick={() =>
                              setPinnedSource((current) =>
                                current === id ? null : id
                              )
                            }
                          >
                            <span>
                              [{answerContextSourceIds.indexOf(id) + 1}]
                            </span>
                            {DEMO_DATA.sources[id].title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {!answerError && answerText && followUps.length > 0 && (
                    <div className="thread-followup">
                      <h2>Follow-up</h2>
                      <div className="thread-followup-list">
                        {followUps.map((followUp) => (
                          <button
                            type="button"
                            key={followUp}
                            disabled={isRunning}
                            onClick={() => runFollowUp(followUp)}
                          >
                            <span>{followUp}</span>
                            <ArrowRight size={15} strokeWidth={1.55} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {!answerError && answerText && (
                    <div className="thread-actions">
                      <h2>Actions</h2>
                      <div className="thread-action-row">
                        <button
                          type="button"
                          disabled={isRunning}
                          onClick={() => runAction("summarize")}
                        >
                          Summarize
                        </button>
                        {(answerUsedContext || answerMode !== "ask") &&
                          selectedSourceIds.length >= 2 && (
                            <button
                              type="button"
                              disabled={isRunning}
                              onClick={() => runAction("compare")}
                            >
                              Compare
                            </button>
                          )}
                        <button
                          type="button"
                          disabled={isRunning}
                          onClick={() => runAction("plan")}
                        >
                          Make plan
                        </button>
                      </div>
                    </div>
                  )}

                  {selectionDirty && !isRunning && (
                    <p className="thread-stale-hint">
                      Context changed. Ask again to update.
                    </p>
                  )}
                </div>
              )}

              <div className="thread-mobile-thread">
                <button
                  type="button"
                  className="thread-mobile-thread-toggle"
                  aria-expanded={mobileThreadOpen}
                  onClick={() => setMobileThreadOpen((current) => !current)}
                >
                  <span>The thread</span>
                  <ChevronDown
                    size={18}
                    strokeWidth={1.55}
                    className={mobileThreadOpen ? "is-open" : ""}
                  />
                </button>

                {mobileThreadOpen && (
                  <div className="thread-mobile-thread-body">
                    <ThreadPipeline
                      selectedCount={selectedIds.length}
                      stage={pipelineStage}
                      usesContext={pipelineUsesContext}
                    />

                    <div className="thread-inspecting thread-inspecting-mobile">
                      <h2>Inspecting</h2>
                      {inspectionSource ? (
                        <>
                          <strong>{inspectionSource.title}</strong>
                          <p>{inspectionSource.excerpt}</p>
                        </>
                      ) : (
                        <p>Hover or select a citation to inspect its source.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="thread-side-panel">
            <h2>The thread</h2>
            <p className="thread-panel-intro">
              Context flows into the answer without disappearing behind it.
            </p>

            <ThreadPipeline
              selectedCount={selectedIds.length}
              stage={pipelineStage}
              usesContext={pipelineUsesContext}
            />

            <div className="thread-inspecting">
              <h2>Inspecting</h2>

              {inspectionSource ? (
                <>
                  <strong>{inspectionSource.title}</strong>
                  <p>{inspectionSource.excerpt}</p>
                </>
              ) : (
                <p>Hover or select a citation to inspect its source.</p>
              )}

              {pinnedSource && (
                <button
                  type="button"
                  className="thread-unpin"
                  onClick={() => setPinnedSource(null)}
                >
                  Unpin <span>Esc</span>
                </button>
              )}
            </div>
          </aside>
        </section>

        <footer className="thread-footer">
          <span>Private by design</span>
          <span>Nova · context that stays with the work</span>
        </footer>
      </main>
    </div>
  );
}
