import {
  BrainCircuit,
  Code2,
  FileText,
  Lightbulb,
  Sparkles,
} from "lucide-react";

const suggestions = [
  {
    icon: <Code2 size={20} />,
    title: "Build software",
    prompt: "Help me design a clean FastAPI project architecture.",
  },
  {
    icon: <BrainCircuit size={20} />,
    title: "Learn AI",
    prompt: "Explain how retrieval-augmented generation works.",
  },
  {
    icon: <FileText size={20} />,
    title: "Analyze content",
    prompt: "Help me summarize and understand a technical document.",
  },
  {
    icon: <Lightbulb size={20} />,
    title: "Generate ideas",
    prompt: "Suggest practical AI product ideas I can build.",
  },
];

function WelcomeScreen({ onSuggestionClick }) {
  return (
    <section className="welcome-screen">
      <div className="welcome-logo">
        <Sparkles size={31} />
      </div>

      <p className="welcome-eyebrow">NOVA AI WORKSPACE</p>

      <h2>
        Intelligence built around
        <span> your work.</span>
      </h2>

      <p className="welcome-description">
        Ask questions, explore ideas, write code and build with your private
        local AI assistant.
      </p>

      <div className="suggestion-grid">
        {suggestions.map((suggestion) => (
          <button
            className="suggestion-card"
            key={suggestion.title}
            onClick={() => onSuggestionClick(suggestion.prompt)}
          >
            <div className="suggestion-icon">{suggestion.icon}</div>

            <div>
              <strong>{suggestion.title}</strong>
              <p>{suggestion.prompt}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export default WelcomeScreen;