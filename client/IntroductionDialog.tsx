import { useState } from "react";
import type { Match } from "../shared/matching";
import { age } from "../shared/matching";
import type { Customer, Introduction } from "../shared/schema";
import { templateIntroduction } from "../shared/introduction";
import { Modal } from "./components";
import { fullName } from "./format";
import { post } from "./api";

export function IntroductionDialog({
  customer,
  match,
  aiConfigured,
  close,
  sent,
}: {
  customer: Customer;
  match: Match;
  aiConfigured: boolean;
  close: () => void;
  sent: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<Introduction>(() =>
    templateIntroduction(customer.profile, match),
  );
  const [busy, setBusy] = useState<"ai" | "send" | null>(null),
    [error, setError] = useState(""),
    [edited, setEdited] = useState(false);
  async function generate() {
    setBusy("ai");
    setError("");
    try {
      const value = await post<Introduction>(
        `/customers/${customer.id}/introductions`,
        { candidateId: match.candidate.id },
      );
      setDraft(value);
      setEdited(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to generate a draft.");
    } finally {
      setBusy(null);
    }
  }
  async function send() {
    setBusy("send");
    setError("");
    try {
      await post(`/customers/${customer.id}/sends`, {
        candidateId: match.candidate.id,
        subject: draft.subject,
        introduction: draft.introduction,
        source: edited ? "edited" : draft.source,
      });
      await sent();
      close();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to record this introduction.",
      );
    } finally {
      setBusy(null);
    }
  }
  return (
    <Modal
      title="Draft introduction"
      subtitle="Review the profile, prepare an introduction and record a mock email."
      onClose={() => {
        if (!busy) close();
      }}
    >
      <div className="send-dialog">
        <dl className="draft-context">
          <div>
            <dt>To</dt>
            <dd>
              {fullName(customer.profile)}
              <small>{customer.profile.email}</small>
            </dd>
          </div>
          <div>
            <dt>Introducing</dt>
            <dd>
              {fullName(match.candidate)}
              <small>
                {age(match.candidate.dob)} years · {match.candidate.city} ·{" "}
                {match.candidate.designation}
              </small>
            </dd>
          </div>
        </dl>
        <div className="ai-draft-panel">
          <div>
            <strong>Personalize with Gemini</strong>
            <p>
              Draft an introduction using shared interests and compatibility.
            </p>
          </div>
          <button
            className="button primary"
            onClick={generate}
            disabled={!!busy || !aiConfigured}
          >
            {busy === "ai" ? "Generating draft…" : "Generate with Gemini"}
          </button>
        </div>
        {!aiConfigured && (
          <p className="inline-notice small">
            Gemini is not connected. A template is available for review.
          </p>
        )}
        <div className="draft-toolbar">
          <span
            className={`draft-label ${draft.source === "gemini" ? "ai" : ""}`}
          >
            {draft.source === "gemini" ? "Gemini draft" : "Template draft"}
            {edited ? " · Edited" : ""}
          </span>
          <span>Review before sending</span>
        </div>
        {draft.notice && (
          <p className="inline-notice small" role="status">
            {draft.notice}
          </p>
        )}
        <label>
          Subject
          <input
            value={draft.subject}
            maxLength={160}
            disabled={!!busy}
            onChange={(e) => {
              setDraft({ ...draft, subject: e.target.value });
              setEdited(true);
            }}
          />
        </label>
        <label>
          Introduction
          <textarea
            className="email-editor"
            value={draft.introduction}
            maxLength={3000}
            disabled={!!busy}
            onChange={(e) => {
              setDraft({ ...draft, introduction: e.target.value });
              setEdited(true);
            }}
          />
        </label>
        <div className="conversation-prompt">
          <strong>Suggested conversation starter</strong>
          <p>{draft.discussionQuestion}</p>
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <p className="mock-disclaimer">
          This records a mock email. No real email will be delivered.
        </p>
        <div className="modal-actions">
          <button
            className="button secondary"
            disabled={!!busy}
            onClick={close}
          >
            Cancel
          </button>
          <button
            className="button primary"
            disabled={
              !!busy ||
              draft.introduction.trim().length < 30 ||
              draft.subject.trim().length < 5
            }
            onClick={send}
          >
            {busy === "send" ? "Recording…" : "Send mock email"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
