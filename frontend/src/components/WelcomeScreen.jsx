import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Code2,
  FileSearch,
  Lightbulb,
  WandSparkles,
} from "lucide-react";

const suggestions = [
  {
    icon: Code2,
    title: "Build something",
    description: "Plan, architect or write production-ready software.",
    prompt: "Help me build a production-ready software project.",
  },
  {
    icon: FileSearch,
    title: "Understand a document",
    description: "Summarize, analyze and extract useful information.",
    prompt: "Help me understand and summarize a technical document.",
  },
  {
    icon: WandSparkles,
    title: "Solve a problem",
    description: "Think clearly through a difficult technical challenge.",
    prompt: "Help me solve a difficult technical problem step by step.",
  },
  {
    icon: Lightbulb,
    title: "Explore an idea",
    description: "Turn an early idea into a practical direction.",
    prompt: "Help me explore and improve a new product idea.",
  },
];

const containerAnimation = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.12,
    },
  },
};

const itemAnimation = {
  hidden: {
    opacity: 0,
    y: 14,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

function WelcomeScreen({ onSuggestionClick }) {
  return (
    <motion.section
      className="welcome-screen"
      variants={containerAnimation}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="nova-orb" variants={itemAnimation}>
        <div className="nova-orb-glow" />
        <div className="nova-orb-core" />

        <div className="nova-orbit nova-orbit-one">
          <span />
        </div>

        <div className="nova-orbit nova-orbit-two">
          <span />
        </div>
      </motion.div>

      <motion.p className="welcome-kicker" variants={itemAnimation}>
        NOVA
        <span />
        PERSONAL AI WORKSPACE
      </motion.p>

      <motion.h1 variants={itemAnimation}>
        {getGreeting()}, Saud.
      </motion.h1>

      <motion.h2 variants={itemAnimation}>
        What would you like to create?
      </motion.h2>

      <motion.p
        className="welcome-description"
        variants={itemAnimation}
      >
        Think, build and explore with a private AI workspace designed around
        your ideas.
      </motion.p>

      <motion.div
        className="suggestion-grid"
        variants={containerAnimation}
      >
        {suggestions.map((suggestion) => {
          const Icon = suggestion.icon;

          return (
            <motion.button
              className="suggestion-card"
              key={suggestion.title}
              variants={itemAnimation}
              whileHover={{
                y: -3,
              }}
              whileTap={{
                scale: 0.985,
              }}
              onClick={() => onSuggestionClick(suggestion.prompt)}
            >
              <div className="suggestion-icon">
                <Icon size={18} strokeWidth={1.8} />
              </div>

              <div className="suggestion-copy">
                <strong>{suggestion.title}</strong>
                <p>{suggestion.description}</p>
              </div>

              <ArrowUpRight
                className="suggestion-arrow"
                size={16}
                strokeWidth={1.8}
              />
            </motion.button>
          );
        })}
      </motion.div>
    </motion.section>
  );
}

export default WelcomeScreen;