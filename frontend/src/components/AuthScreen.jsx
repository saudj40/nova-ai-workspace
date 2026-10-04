import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import NovaLogo from "./NovaLogo";
import "./AuthScreen.css";

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isSignUp = mode === "signup";

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await signUp({
          email: email.trim(),
          password,
        });

        if (signUpError) {
          throw signUpError;
        }

        if (data.session) {
          return;
        }

        setMessage(
          "Account created. Check your email to confirm your account, then sign in."
        );

        setMode("signin");
        setPassword("");
      } else {
        const { error: signInError } = await signIn({
          email: email.trim(),
          password,
        });

        if (signInError) {
          throw signInError;
        }
      }
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setMessage("");
    setPassword("");
  };

  return (
    <main className="nova-auth">
      <div className="nova-auth-glow nova-auth-glow-one" />
      <div className="nova-auth-glow nova-auth-glow-two" />

      <section className="nova-auth-shell">
        <div className="nova-auth-brand">
          <NovaLogo size="md" />
        </div>

        <div className="nova-auth-card">
          <div className="nova-auth-heading">
            <span className="nova-auth-eyebrow">
              {isSignUp ? "Create your workspace" : "Welcome back"}
            </span>

            <h1>
              {isSignUp
                ? "Start thinking with Nova."
                : "Continue where you left off."}
            </h1>

            <p>
              {isSignUp
                ? "Your intelligent workspace for conversations, knowledge and ideas."
                : "Sign in to access your private Nova workspace."}
            </p>
          </div>

          <div className="nova-auth-tabs">
            <button
              type="button"
              className={mode === "signin" ? "active" : ""}
              onClick={() => switchMode("signin")}
            >
              Sign in
            </button>

            <button
              type="button"
              className={mode === "signup" ? "active" : ""}
              onClick={() => switchMode("signup")}
            >
              Create account
            </button>
          </div>

          <form className="nova-auth-form" onSubmit={handleSubmit}>
            <label>
              Email
              <input
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading}
              />
            </label>

            <label>
              Password
              <input
                type="password"
                placeholder="••••••••"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading}
              />
            </label>

            {error && <div className="nova-auth-error">{error}</div>}

            {message && <div className="nova-auth-message">{message}</div>}

            <button
              className="nova-auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="nova-auth-spinner" size={17} />
                  Please wait
                </>
              ) : (
                <>
                  {isSignUp ? "Create account" : "Enter Nova"}
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="nova-auth-footer">
          Private by design. Your workspace belongs to your account.
        </p>
      </section>
    </main>
  );
}