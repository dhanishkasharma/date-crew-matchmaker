import { useState, type FormEvent } from "react";
import type { PreferenceProposal } from "../shared/ai";
import type { Customer } from "../shared/schema";
import { post } from "./api";

export function PreferenceAssistant({
  customer,
  configured,
  applied,
}: {
  customer: Customer;
  configured: boolean;
  applied: () => Promise<void>;
}) {
  const [text, setText] = useState(""),
    [proposal, setProposal] = useState<PreferenceProposal | null>(null),
    [busy, setBusy] = useState<"preview" | "apply" | null>(null),
    [error, setError] = useState(""),
    [stale, setStale] = useState(false);
  async function preview(event: FormEvent) {
    event.preventDefault();
    setBusy("preview");
    setError("");
    setProposal(null);
    setStale(false);
    try {
      setProposal(
        await post<PreferenceProposal>(
          `/customers/${customer.id}/preference-proposals`,
          { text },
        ),
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to prepare a preview. You can edit preferences manually.",
      );
    } finally {
      setBusy(null);
    }
  }
  async function apply() {
    if (!proposal?.proposalId) return;
    setBusy("apply");
    setError("");
    try {
      await post(
        `/customers/${customer.id}/preference-proposals/${proposal.proposalId}/apply`,
        {},
      );
      await applied();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to apply this preview. Generate a new preview before trying again.",
      );
      setStale(true);
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="preference-assistant">
      <form onSubmit={preview}>
        <label htmlFor="preference-request">
          Describe the changes you have in mind
        </label>
        <p className="muted small">
          Start from saved preferences. Be specific about what is flexible and
          what is a must.
        </p>
        <textarea
          id="preference-request"
          placeholder="Prefer ages 28–34, Bengaluru or Pune; non-smoking is a must."
          value={text}
          maxLength={1500}
          minLength={8}
          required
          disabled={!!busy}
          onChange={(event) => {
            setText(event.target.value);
            setProposal(null);
            setError("");
            setStale(false);
          }}
        />
        <div className="assistant-request-footer">
          <span>Nothing is saved until you apply the preview.</span>
          <button
            className="button primary"
            type="submit"
            disabled={!!busy || !configured || text.trim().length < 8}
          >
            {busy === "preview" ? "Preparing preview…" : "Preview with AI"}
          </button>
        </div>
        {!configured && (
          <p className="inline-notice small">
            AI is not connected. Switch to Manual preferences to make changes.
          </p>
        )}
      </form>
      {proposal && (
        <section
          className="preference-preview"
          aria-label="Preference preview"
          aria-live="polite"
        >
          <div className="preference-preview-heading">
            <h3>
              {proposal.status === "ready"
                ? "Review proposed changes"
                : proposal.status === "clarify"
                  ? "A little more detail is needed"
                  : "Preview unavailable"}
            </h3>
            <span className="draft-label">Not saved</span>
          </div>
          {proposal.notice && (
            <p className="inline-notice">{proposal.notice}</p>
          )}
          {!!proposal.changes.length && (
            <>
              <dl className="pool-impact">
                <div>
                  <dt>Eligible now</dt>
                  <dd>{proposal.eligibleBefore}</dd>
                </div>
                <span aria-hidden="true">→</span>
                <div>
                  <dt>After these changes</dt>
                  <dd>{proposal.eligibleAfter}</dd>
                </div>
              </dl>
              <p className="muted small">
                Firm rules affect eligibility. Flexible preferences may change
                the order without changing this count.
              </p>
              <div className="preference-changes">
                {proposal.changes.map((change) => (
                  <article key={change.field}>
                    <h4>{change.label}</h4>
                    <div className="preference-change-values">
                      <span>
                        <small>Saved</small>
                        {change.before}
                      </span>
                      <span>
                        <small>Proposed</small>
                        {change.after}
                      </span>
                    </div>
                    <p>From your request: “{change.quote}”</p>
                  </article>
                ))}
              </div>
            </>
          )}
          {!!proposal.questions.length && (
            <div className="preview-questions">
              <h4>Please clarify</h4>
              <ul>
                {proposal.questions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </div>
          )}
          {!!proposal.unsupported.length && (
            <div className="preview-questions">
              <h4>Outside the supported preferences</h4>
              <ul>
                {proposal.unsupported.map((request) => (
                  <li key={request}>{request}</li>
                ))}
              </ul>
            </div>
          )}
          {proposal.status === "clarify" && (
            <p className="muted small">
              Edit your request and generate another preview. These changes
              cannot be applied yet.
            </p>
          )}
          {proposal.status === "ready" && (
            <div className="assistant-apply">
              <p>
                Review each change. All other saved preferences stay as they
                are.
              </p>
              <button
                className="button primary"
                disabled={!!busy || stale}
                onClick={() => void apply()}
              >
                {busy === "apply" ? "Applying…" : "Apply preferences"}
              </button>
            </div>
          )}
        </section>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
