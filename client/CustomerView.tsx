import { useMemo, useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import type { Bootstrap, Customer, Stage } from "../shared/schema";
import { stages } from "../shared/constants";
import { age, rankMatches } from "../shared/matching";
import { Avatar, Empty, Verified } from "./components";
import { dateTime, fullName } from "./format";
import { ProfileDetails } from "./ProfileDetails";
import { MatchCards } from "./MatchCards";
import { PreferencesEditor } from "./PreferencesEditor";
import { patch, post } from "./api";

function Notes({
  customer,
  data,
  reload,
  notify,
}: {
  customer: Customer;
  data: Bootstrap;
  reload: () => Promise<void>;
  notify: (message: string) => void;
}) {
  const [text, setText] = useState(""),
    [type, setType] = useState("Note"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const notes = data.notes.filter((n) => n.customerId === customer.id),
    sends = data.sends.filter((s) => s.customerId === customer.id);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await post(`/customers/${customer.id}/notes`, { type, text });
      await reload();
      setText("");
      notify("Note saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save note.");
    } finally {
      setBusy(false);
    }
  }
  const events = [
    ...notes.map((n) => ({ ...n, kind: "note" as const })),
    ...sends.map((s) => ({ ...s, kind: "send" as const })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div className="notes-layout">
      <form className="info-card note-form" onSubmit={submit}>
        <h3>Add a note</h3>
        <p className="muted small">
          Record meeting notes, calls and follow-ups.
        </p>
        <label>
          Interaction type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option>Note</option>
            <option>Call</option>
            <option>Meeting</option>
          </select>
        </label>
        <label>
          Your note
          <textarea
            placeholder="Add relevant context and next steps…"
            maxLength={3000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />
        </label>
        <div className="note-form-footer">
          <span>{text.length} / 3000</span>
          <button
            className="button primary compact"
            disabled={busy || !text.trim()}
          >
            {busy ? "Saving…" : "Save note"}
          </button>
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
      </form>
      <section className="timeline">
        <div className="section-heading">
          <h2>Notes & activity</h2>
          <span className="count-badge">{events.length}</span>
        </div>
        {events.length ? (
          events.map((event) => (
            <article className="timeline-item" key={event.id}>
              <div>
                <div className="timeline-meta">
                  <strong>
                    {event.kind === "send"
                      ? "Match introduction recorded"
                      : `${event.type} with ${customer.profile.firstName}`}
                  </strong>
                  <time>{dateTime(event.createdAt)}</time>
                </div>
                <p>
                  {event.kind === "send"
                    ? `Introduced ${data.candidates.find((p) => p.id === event.candidateId)?.firstName || "a candidate"}. Mock email only — no real email delivered.`
                    : event.text}
                </p>
                <small>
                  {event.kind === "send"
                    ? `${event.source === "gemini" ? "AI draft" : event.source === "edited" ? "Reviewed and edited draft" : "Template draft"} · ${event.policyVersion}`
                    : event.author}
                </small>
              </div>
            </article>
          ))
        ) : (
          <Empty title="No activity yet">
            Your notes and introductions will appear in this timeline.
          </Empty>
        )}
      </section>
    </div>
  );
}

export function CustomerView({
  data,
  reload,
  notify,
}: {
  data: Bootstrap;
  reload: () => Promise<void>;
  notify: (message: string) => void;
}) {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const [preferencesOpen, setPreferencesOpen] = useState(false),
    [stageBusy, setStageBusy] = useState(false);
  const customer = data.customers.find((c) => c.id === id);
  const report = useMemo(
    () => (customer ? rankMatches(customer.profile, data.candidates) : null),
    [customer, data.candidates],
  );
  if (!customer || !report)
    return (
      <Empty title="This customer isn’t in your workspace">
        <Link to="/customers">Return to your customers</Link>
      </Empty>
    );
  const p = customer.profile,
    tab = params.get("tab") || "profile";
  const sends = data.sends.filter((s) => s.customerId === customer.id);
  const notes = data.notes.filter((n) => n.customerId === customer.id);
  async function updateStage(stage: Stage) {
    setStageBusy(true);
    try {
      await patch(`/customers/${id}/stage`, { stage });
      await reload();
      notify("Journey stage updated.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not update stage.");
    } finally {
      setStageBusy(false);
    }
  }
  return (
    <div>
      <div className="customer-record-nav">
        <Link to="/customers" className="back-link">
          <ArrowLeft size={15} />
          All customers
        </Link>
        <span>{p.id.toUpperCase()}</span>
      </div>
      <section className="customer-overview" aria-label="Customer brief">
        <div className="customer-overview-top">
          <Avatar name={fullName(p)} id={p.id} large />
          <div className="customer-overview-person">
            <div className="customer-name-heading">
              <h1>{fullName(p)}</h1>
              <Verified verified={p.verified} />
            </div>
            <p>
              {age(p.dob)} years · {p.gender} · {p.height} cm · {p.city}
            </p>
            <span>
              {p.designation} at {p.company}
            </span>
          </div>
          <div className="customer-overview-actions">
            <label htmlFor="journey-stage">Journey stage</label>
            <select
              id="journey-stage"
              value={customer.stage}
              disabled={stageBusy}
              onChange={(e) => void updateStage(e.target.value as Stage)}
            >
              {stages.map((stage) => (
                <option key={stage}>{stage}</option>
              ))}
            </select>
            <button
              className="text-button"
              onClick={() => setPreferencesOpen(true)}
            >
              Edit partner preferences
            </button>
          </div>
        </div>
        <dl className="customer-brief">
          <div>
            <dt>Children</dt>
            <dd>{p.wantKids || "Not provided"}</dd>
          </div>
          <div>
            <dt>Open to relocate</dt>
            <dd>{p.relocate || "Not provided"}</dd>
          </div>
          <div>
            <dt>Open to pets</dt>
            <dd>{p.pets || "Not provided"}</dd>
          </div>
          <div>
            <dt>Marriage timeline</dt>
            <dd>{p.timeline || "Not provided"}</dd>
          </div>
        </dl>
      </section>
      <div className="customer-main">
        <div
          className="detail-tabs"
          role="tablist"
          aria-label="Customer workspace"
        >
          <button
            role="tab"
            aria-selected={tab === "profile"}
            className={tab === "profile" ? "active" : ""}
            onClick={() => setParams({ tab: "profile" })}
          >
            Profile
          </button>
          <button
            role="tab"
            aria-selected={tab === "matches"}
            className={tab === "matches" ? "active" : ""}
            onClick={() => setParams({ tab: "matches" })}
          >
            Suggested matches<span>{report.eligible}</span>
          </button>
          <button
            role="tab"
            aria-selected={tab === "notes"}
            className={tab === "notes" ? "active" : ""}
            onClick={() => setParams({ tab: "notes" })}
          >
            Notes & activity<span>{notes.length + sends.length}</span>
          </button>
        </div>
        {tab === "matches" ? (
          <MatchCards
            key={customer.id}
            customer={customer}
            report={report}
            sends={sends}
            aiConfigured={data.aiConfigured}
            aiAssistanceAvailable={data.aiAssistanceAvailable === true}
            reload={reload}
            notify={notify}
          />
        ) : tab === "notes" ? (
          <Notes
            key={customer.id}
            customer={customer}
            data={data}
            reload={reload}
            notify={notify}
          />
        ) : (
          <>
            <div className="profile-prompt">
              <div>
                <h3>{report.eligible} eligible candidates</h3>
                <p>
                  Review shared plans, values and the reasons behind each match.
                </p>
              </div>
              <button
                className="button primary"
                onClick={() => setParams({ tab: "matches" })}
              >
                Review matches
              </button>
            </div>
            <ProfileDetails profile={p} />
          </>
        )}
      </div>
      {preferencesOpen && (
        <PreferencesEditor
          key={customer.id}
          customer={customer}
          aiConfigured={data.aiConfigured}
          aiAssistanceAvailable={data.aiAssistanceAvailable === true}
          close={() => setPreferencesOpen(false)}
          saved={async () => {
            await reload();
            notify("Preferences saved. The shortlist has been refreshed.");
          }}
        />
      )}
    </div>
  );
}
