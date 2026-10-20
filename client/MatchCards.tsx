import { useState } from "react";
import { age, type Match, type MatchReport } from "../shared/matching";
import type { Customer, Profile, Send as SendRecord } from "../shared/schema";
import { Avatar, Empty, Modal, Verified } from "./components";
import { fullName } from "./format";
import { ProfileDetails } from "./ProfileDetails";
import { IntroductionDialog } from "./IntroductionDialog";
import type { ShortlistReview } from "../shared/ai";
import { ShortlistReviewPanel } from "./ShortlistReview";
import { post } from "./api";

export function CandidateDialog({
  profile,
  close,
}: {
  profile: Profile;
  close: () => void;
}) {
  return (
    <Modal
      title={fullName(profile)}
      subtitle={`${age(profile.dob)} years · ${profile.city} · ${profile.designation}`}
      onClose={close}
      wide
    >
      <div className="candidate-dialog">
        <Verified verified={profile.verified} />
        <ProfileDetails profile={profile} />
      </div>
    </Modal>
  );
}

export function MatchCards({
  customer,
  report,
  sends,
  aiConfigured,
  aiAssistanceAvailable,
  reload,
  notify,
}: {
  customer: Customer;
  report: MatchReport;
  sends: SendRecord[];
  aiConfigured: boolean;
  aiAssistanceAvailable: boolean;
  reload: () => Promise<void>;
  notify: (message: string) => void;
}) {
  const [candidate, setCandidate] = useState<Profile | null>(null),
    [sending, setSending] = useState<Match | null>(null),
    [limit, setLimit] = useState(6),
    [highOnly, setHighOnly] = useState(false),
    [reviewState, setReviewState] = useState<{
      context: string;
      value: ShortlistReview;
    } | null>(null),
    [reviewBusy, setReviewBusy] = useState(false),
    [reviewError, setReviewError] = useState(""),
    [aiOrder, setAiOrder] = useState(false);
  const context = JSON.stringify([
    customer.profile,
    report.matches.slice(0, 8),
  ]);
  const review = reviewState?.context === context ? reviewState.value : null;
  const reviewedIds =
    aiOrder && review?.source === "ai"
      ? review.items.map((item) => item.candidateId)
      : [];
  const ordered = reviewedIds.length
    ? [
        ...reviewedIds.map((id) =>
          report.matches.find((match) => match.candidate.id === id)!,
        ),
        ...report.matches.filter(
          (match) => !reviewedIds.includes(match.candidate.id),
        ),
      ]
    : report.matches;
  const matches = highOnly
    ? ordered.filter((m) => m.band === "High potential")
    : ordered;
  async function generateReview() {
    setReviewBusy(true);
    setReviewError("");
    try {
      const value = await post<ShortlistReview>(
        `/customers/${customer.id}/shortlist-review`,
        {},
      );
      setReviewState({ context, value });
    } catch (error) {
      setReviewError(
        error instanceof Error
          ? error.message
          : "AI could not review the shortlist. Try again.",
      );
    } finally {
      setReviewBusy(false);
    }
  }
  const canSend =
    customer.profile.verified &&
    !["Paused", "Closed", "Onboarding"].includes(customer.stage);
  return (
    <div className="matches-section">
      <div className="matches-heading">
        <div>
          <h2>Suggested matches</h2>
          <p>
            {report.eligible} eligible profiles from {report.pool}{" "}
            opposite-gender candidates.
          </p>
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            checked={highOnly}
            onChange={(e) => {
              setHighOnly(e.target.checked);
              setLimit(6);
            }}
          />
          High potential only
        </label>
      </div>
      {aiAssistanceAvailable && (
        <ShortlistReviewPanel
          report={report}
          review={review}
          busy={reviewBusy}
          error={reviewError}
          configured={aiConfigured}
          aiOrder={aiOrder}
          generate={() => void generateReview()}
          changeOrder={(value) => {
            setAiOrder(value);
            setLimit(6);
          }}
        />
      )}
      {!canSend && (
        <p className="inline-notice">
          Introductions are paused. Review this customer’s verification and
          journey stage before sending.
        </p>
      )}
      <details className="eligibility-details">
        <summary>How these matches are selected</summary>
        <div>
          <p>
            Verified, available candidates who meet both people’s firm
            preferences. Scores describe profile fit, not relationship success.
            Unknown information lowers evidence coverage.
          </p>
          {customer.profile.gender === "Male" && (
            <p>
              <strong>Assessment policy:</strong> younger, shorter, lower
              comparable annual income, and identical children preferences.
            </p>
          )}
          <div className="exclusion-list">
            {Object.entries(report.exclusions)
              .sort((a, b) => b[1] - a[1])
              .map(([reason, count]) => (
                <span key={reason}>
                  {reason}
                  <b>{count}</b>
                </span>
              ))}
          </div>
          <small>
            One excluded profile can fail multiple checks; counts may overlap.
          </small>
        </div>
      </details>
      {matches.length ? (
        <div className="match-list">
          {matches.slice(0, limit).map((match) => {
            const p = match.candidate,
              wasSent = sends.some((s) => s.candidateId === p.id);
            return (
              <article className="match-card" key={p.id}>
                <div className="match-card-header">
                  <span
                    className={`fit-band ${match.band === "High potential" ? "high" : ""}`}
                  >
                    {match.band}
                  </span>
                  <span className="match-position">
                    {reviewedIds.includes(p.id)
                      ? `AI review ${reviewedIds.indexOf(p.id) + 1}`
                      : `Rank ${report.matches.findIndex((item) => item.candidate.id === p.id) + 1}`}
                  </span>
                </div>
                <div className="match-person">
                  <Avatar name={fullName(p)} id={p.id} large />
                  <div>
                    <button
                      className="name-button"
                      onClick={() => setCandidate(p)}
                    >
                      {fullName(p)}
                    </button>
                    <p className="candidate-demographics">
                      {age(p.dob)} years · {p.height} cm · {p.city}
                    </p>
                    <Verified verified={p.verified} />
                  </div>
                  <div className="match-score">
                    <strong>
                      {match.score}
                      <small>/100</small>
                    </strong>
                    <span>Mutual fit</span>
                  </div>
                </div>
                <dl className="candidate-facts">
                  <div>
                    <dt>Work</dt>
                    <dd>
                      {p.designation} at {p.company}
                    </dd>
                  </div>
                  <div>
                    <dt>Education</dt>
                    <dd>
                      {p.degree} · {p.college}
                    </dd>
                  </div>
                </dl>
                <div className="match-evidence">
                  <h3>Why this could work</h3>
                  <ul>
                    {match.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                  {match.questions[0] && (
                    <p className="match-question">
                      <strong>Worth discussing</strong>
                      {match.questions[0]}
                    </p>
                  )}
                </div>
                <details className="score-details">
                  <summary>
                    Compatibility breakdown
                    <span>{match.coverage}% evidence coverage</span>
                  </summary>
                  <div className="score-breakdown">
                    {match.breakdown.map((part) => (
                      <div key={part.key}>
                        <span>
                          {part.label}
                          <small>{Math.round(part.weight * 100)}% weight</small>
                        </span>
                        <div>
                          <i style={{ width: `${part.fit * 100}%` }} />
                        </div>
                        <b>{Math.round(part.fit * 100)}</b>
                      </div>
                    ))}
                    <p>
                      Customer fit {match.customerFit} · Candidate fit{" "}
                      {match.candidateFit}
                    </p>
                  </div>
                </details>
                <div className="match-card-actions">
                  <button
                    className="text-button"
                    onClick={() => setCandidate(p)}
                  >
                    View full profile
                  </button>
                  <button
                    className={`button ${wasSent ? "sent-button" : "primary"}`}
                    disabled={wasSent || !canSend}
                    onClick={() => setSending(match)}
                  >
                    {wasSent ? "Match sent" : "Send Match"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <Empty
          title={highOnly ? "No high potential matches" : "No eligible matches"}
        >
          {highOnly
            ? "Clear this filter to review all eligible candidates."
            : "Review the exclusions and flexible preferences. Firm preferences are never relaxed automatically."}
        </Empty>
      )}
      {matches.length > limit && (
        <button
          className="button secondary load-more"
          onClick={() => setLimit(limit + 6)}
        >
          Show more matches <span>({matches.length - limit} remaining)</span>
        </button>
      )}
      {candidate && (
        <CandidateDialog profile={candidate} close={() => setCandidate(null)} />
      )}
      {sending && (
        <IntroductionDialog
          customer={customer}
          match={sending}
          aiConfigured={aiConfigured}
          close={() => setSending(null)}
          sent={async () => {
            await reload();
            notify("Mock email recorded. No email was delivered.");
          }}
        />
      )}
    </div>
  );
}
