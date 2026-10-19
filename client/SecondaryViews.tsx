import { useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import type { Bootstrap, Profile } from "../shared/schema";
import { age } from "../shared/matching";
import { Empty, Verified } from "./components";
import { dateTime, fullName } from "./format";
import { CandidateDialog } from "./MatchCards";
import { ProfileMini } from "./ProfileDetails";

export function Pool({ data }: { data: Bootstrap }) {
  const [search, setSearch] = useState(""),
    [gender, setGender] = useState("All profiles"),
    [limit, setLimit] = useState(12),
    [selected, setSelected] = useState<Profile | null>(null);
  const results = data.candidates.filter(
    (p) =>
      (gender === "All profiles" || p.gender === gender) &&
      `${fullName(p)} ${p.city} ${p.designation}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="fade-in">
      <div className="page-heading">
        <div>
          <h1>Candidate pool</h1>
          <p>
            Browse {data.candidates.length} fictional profiles and review their
            biodata.
          </p>
        </div>
        <span className="subtle-chip">
          {data.candidates.filter((p) => p.gender === "Female").length} women ·{" "}
          {data.candidates.filter((p) => p.gender === "Male").length} men
        </span>
      </div>
      <div className="pool-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="Search profile pool"
            placeholder="Search profiles, cities, or professions…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setLimit(12);
            }}
          />
        </label>
        <select
          aria-label="Filter profile pool by gender"
          value={gender}
          onChange={(e) => {
            setGender(e.target.value);
            setLimit(12);
          }}
        >
          <option>All profiles</option>
          <option>Female</option>
          <option>Male</option>
        </select>
        <span className="muted small">{results.length} profiles</span>
      </div>
      <div className="pool-grid">
        {results.slice(0, limit).map((p) => (
          <article className="pool-card" key={p.id}>
            <div className="pool-card-top">
              <span className="profile-code">
                {p.id.replace("pool-", "").toUpperCase()}
              </span>
              <Verified verified={p.verified} />
            </div>
            <h3>{fullName(p)}</h3>
            <p>
              {age(p.dob)} years · {p.gender} · {p.maritalStatus}
            </p>
            <ProfileMini profile={p} />
            <div className="tag-list">
              {p.interests.map((v) => (
                <span key={v}>{v}</span>
              ))}
            </div>
            <button className="text-button" onClick={() => setSelected(p)}>
              View biodata
            </button>
          </article>
        ))}
      </div>
      {!results.length && (
        <Empty title="No profiles found">
          Try a different name, city, or profession.
        </Empty>
      )}
      {results.length > limit && (
        <button
          className="button secondary load-more"
          onClick={() => setLimit(limit + 12)}
        >
          Show more profiles
        </button>
      )}
      {selected && (
        <CandidateDialog profile={selected} close={() => setSelected(null)} />
      )}
    </div>
  );
}
export function ActivityView({ data }: { data: Bootstrap }) {
  const events = [
    ...data.notes.map((n) => ({
      id: n.id,
      customerId: n.customerId,
      title: `${n.type} added`,
      body: n.text,
      time: n.createdAt,
      type: "note",
    })),
    ...data.sends.map((s) => ({
      id: s.id,
      customerId: s.customerId,
      title: "Introduction recorded",
      body: `${s.subject}. Mock email only — no real email delivered.`,
      time: s.createdAt,
      type: "send",
    })),
  ].sort((a, b) => b.time.localeCompare(a.time));
  return (
    <div className="fade-in">
      <div className="page-heading">
        <div>
          <h1>Activity</h1>
          <p>Notes, calls and introductions across your assigned customers.</p>
        </div>
        <span className="subtle-chip">{events.length} records</span>
      </div>
      <section className="activity-feed">
        {events.length ? (
          events.map((event) => {
            const customer = data.customers.find(
              (c) => c.id === event.customerId,
            );
            return (
              <article className="activity-card" key={event.id}>
                <div>
                  <time>{dateTime(event.time)}</time>
                  <h3>
                    {event.title}
                    <span> · {customer?.profile.firstName}</span>
                  </h3>
                  <p>{event.body}</p>
                  <Link
                    to={`/customers/${event.customerId}?tab=notes`}
                    className="text-button"
                  >
                    Open customer workspace
                  </Link>
                </div>
              </article>
            );
          })
        ) : (
          <Empty title="No activity yet">
            Your notes and mock introductions will appear here.
          </Empty>
        )}
      </section>
    </div>
  );
}
