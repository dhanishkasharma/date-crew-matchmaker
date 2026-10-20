import { useState } from "react";
import type { ShortlistReview } from "../shared/ai";
import type { MatchReport } from "../shared/matching";
import { fullName } from "./format";
import { Modal } from "./components";

export function ShortlistReviewPanel({
  report,
  review,
  busy,
  error,
  configured,
  aiOrder,
  generate,
  changeOrder,
}: {
  report: MatchReport;
  review: ShortlistReview | null;
  busy: boolean;
  error: string;
  configured: boolean;
  aiOrder: boolean;
  generate: () => void;
  changeOrder: (value: boolean) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = review?.items.find(
    (item) => item.candidateId === selectedId,
  );
  const name = (id: string) => {
    const profile = report.matches.find(
      (match) => match.candidate.id === id,
    )?.candidate;
    return profile ? fullName(profile) : "Candidate";
  };
  return (
    <section
      className="ai-review-panel"
      aria-label="AI shortlist review"
      aria-busy={busy}
    >
      <div className="ai-review-heading">
        <div>
          <span className="section-eyebrow">A second perspective</span>
          <h3>AI shortlist review</h3>
          <p>
            {review?.source === "ai"
              ? review.summary
              : `Compare the tradeoffs across your top ${Math.min(8, report.eligible)} eligible candidates. Your mutual-fit scores stay visible.`}
          </p>
        </div>
        <button
          className="button secondary"
          disabled={busy || !configured || !report.eligible}
          onClick={generate}
        >
          {busy
            ? "Reviewing shortlist…"
            : review?.source === "ai"
              ? "Review with AI again"
              : "Review with AI"}
        </button>
      </div>
      {busy && (
        <p className="muted small" role="status">
          Comparing stated plans, shared priorities and open questions. This may
          take a moment.
        </p>
      )}
      {!configured && (
        <p className="inline-notice small">
          AI is not connected. You can continue with mutual-fit ranking.
        </p>
      )}
      {review?.notice && (
        <p className="inline-notice small" role="status">
          {review.notice}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {review?.source === "ai" && (
        <>
          <div className="review-order-toolbar">
            <span>
              Review of {review.reviewed} candidates · AI interpretation
            </span>
            <div className="segmented-control" aria-label="Shortlist ordering">
              <button
                aria-pressed={!aiOrder}
                onClick={() => changeOrder(false)}
              >
                Mutual-fit order
              </button>
              <button aria-pressed={aiOrder} onClick={() => changeOrder(true)}>
                AI review order
              </button>
            </div>
          </div>
          <ol className="review-candidates">
            {review.items.map((item, index) => (
              <li key={item.candidateId}>
                <button onClick={() => setSelectedId(item.candidateId)}>
                  <span className="review-number">{index + 1}</span>
                  <span>
                    <strong>{name(item.candidateId)}</strong>
                    <small>
                      {item.concerns.length
                        ? `${item.concerns.length} open ${item.concerns.length === 1 ? "question" : "questions"}`
                        : "Review the supporting facts"}
                    </small>
                  </span>
                  <span className="review-link">Read review</span>
                </button>
              </li>
            ))}
          </ol>
          <p className="review-footnote">
            AI reviewed these {review.reviewed} candidates only. Firm rules and
            known concerns remain in place. This is a discussion aid, not a
            prediction of relationship success.
          </p>
        </>
      )}
      {selected && (
        <Modal
          title={`AI review · ${name(selected.candidateId)}`}
          subtitle="AI-selected evidence from saved profile facts. Review before deciding."
          onClose={() => setSelectedId(null)}
          wide
        >
          <div className="ai-review-detail">
            <p className="review-rationale">{selected.rationale}</p>
            <h3>Supporting profile facts</h3>
            <div
              className="evidence-table"
              role="table"
              aria-label="Supporting profile facts"
            >
              <div className="evidence-table-head" role="row">
                <span role="columnheader">Profile detail</span>
                <span role="columnheader">Customer</span>
                <span role="columnheader">Candidate</span>
              </div>
              {selected.facts.map((fact) => (
                <div className="evidence-table-row" role="row" key={fact.id}>
                  <strong role="rowheader">
                    {fact.label}
                    <small>
                      {fact.kind === "alignment"
                        ? "Shared evidence"
                        : fact.kind === "discussion"
                          ? "Confirm together"
                          : "Stated context"}
                    </small>
                  </strong>
                  <span role="cell">{fact.customer}</span>
                  <span role="cell">{fact.candidate}</span>
                </div>
              ))}
            </div>
            {!!selected.concerns.length && (
              <div className="review-concerns">
                <h3>Still worth discussing</h3>
                <ul>
                  {selected.concerns.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="conversation-prompt">
              <strong>Ask next</strong>
              <p>{selected.question}</p>
            </div>
            <p className="muted small">
              Explanations use saved profile comparisons selected by AI. The AI
              review order and suggested question still need your judgment.
            </p>
            <div className="modal-actions">
              <button
                className="button secondary"
                onClick={() => setSelectedId(null)}
              >
                Back to shortlist
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
