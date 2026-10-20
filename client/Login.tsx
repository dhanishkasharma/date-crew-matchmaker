import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Brand } from "./components";
import { post } from "./api";

export function Login({ onLogin }: { onLogin: () => Promise<void> }) {
  const [username, setUsername] = useState("priya"),
    [password, setPassword] = useState("TdcDemo2026!");
  const [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await post("/auth/login", { username, password });
      await onLogin();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <section className="login-story">
        <Brand light />
        <div className="story-copy">
          <span className="login-section-label">TDC Matchmaker</span>
          <h1>
            Consider the person.
            <br />
            Understand the fit.
          </h1>
          <p>
            A focused workspace for reviewing profiles, managing customer
            journeys, and preparing introductions.
          </p>
          <div className="login-workflow">
            <div>
              <span>Customer context</span>
              <p>Profiles, preferences, and conversation notes.</p>
            </div>
            <div>
              <span>Explainable matches</span>
              <p>Mutual fit, eligibility rules, and discussion points.</p>
            </div>
            <div>
              <span>Reviewed introductions</span>
              <p>AI drafting with a matchmaker in control.</p>
            </div>
          </div>
        </div>
        <span className="login-story-footer">The Date Crew</span>
      </section>
      <main className="login-form-panel">
        <div className="login-form-wrap">
          <h2>Sign in</h2>
          <p className="muted">
            Access your assigned customers and shortlists.
          </p>
          <form onSubmit={submit}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <label htmlFor="password">Password</label>
            <div className="password-field">
              <input
                id="password"
                type={visible ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="icon-button"
                aria-label={visible ? "Hide password" : "Show password"}
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="button primary login-submit"
              disabled={busy}
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <div className="demo-login">
            <strong>Assessment access</strong>
            <p>
              Username <b>priya</b>
              <br />
              Password <b>TdcDemo2026!</b>
            </p>
            <small>Fictional customer data. No real emails are sent.</small>
          </div>
        </div>
        <footer>TDC Matchmaker workspace</footer>
      </main>
    </div>
  );
}
