import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import type { Bootstrap } from "../shared/schema";
import { age } from "../shared/matching";
import { Avatar, Empty, StageTag, Verified } from "./components";
import { fullName } from "./format";

export function Dashboard({ data }: { data: Bootstrap }) {
  const [search, setSearch] = useState(""),
    [tab, setTab] = useState("All customers"),
    [city, setCity] = useState("All cities"),
    [verification, setVerification] = useState("All profiles"),
    [filters, setFilters] = useState(false),
    [page, setPage] = useState(1),
    [descending, setDescending] = useState(false);
  const { customers, sends } = data;
  const pending = customers.filter((c) => !c.profile.verified).length;
  const ready = customers.filter(
    (c) =>
      c.profile.verified &&
      ["Profile verified", "Shortlisting"].includes(c.stage),
  ).length;
  const filtered = customers
    .filter((c) => {
      const p = c.profile;
      return (
        `${fullName(p)} ${p.city} ${p.designation}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (tab === "All customers" ||
          (tab === "Needs attention"
            ? !p.verified || c.stage === "Onboarding"
            : c.stage === tab)) &&
        (city === "All cities" || p.city === city) &&
        (verification === "All profiles" ||
          (verification === "Verified" ? p.verified : !p.verified))
      );
    })
    .sort(
      (a, b) =>
        (descending ? -1 : 1) *
        fullName(a.profile).localeCompare(fullName(b.profile)),
    );
  const maxPage = Math.max(1, Math.ceil(filtered.length / 7)),
    activePage = Math.min(page, maxPage),
    rows = filtered.slice((activePage - 1) * 7, activePage * 7);
  function reset() {
    setSearch("");
    setTab("All customers");
    setCity("All cities");
    setVerification("All profiles");
    setPage(1);
  }
  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Customers</h1>
          <p>Keep every profile, preference and next step in view.</p>
        </div>
        <Link className="button secondary" to="/pool">
          Browse candidates
        </Link>
      </div>
      <section className="metrics-strip" aria-label="Workspace overview">
        <div>
          <span>Assigned customers</span>
          <strong>{customers.length}</strong>
          <small>In your workspace</small>
        </div>
        <div>
          <span>Ready for review</span>
          <strong>{ready}</strong>
          <small>Verified and shortlisting</small>
        </div>
        <div>
          <span>Introductions recorded</span>
          <strong>{sends.length}</strong>
          <small>Mock emails</small>
        </div>
        <div>
          <span>Awaiting verification</span>
          <strong>{pending}</strong>
          <small>
            {pending ? "Follow-up required" : "All profiles verified"}
          </small>
        </div>
      </section>
      <section className="table-panel" aria-label="Assigned customers">
        <div
          className="table-tabs"
          role="tablist"
          aria-label="Customer journey filters"
        >
          {[
            "All customers",
            "Shortlisting",
            "Introductions",
            "Needs attention",
          ].map((value) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              className={tab === value ? "active" : ""}
              onClick={() => {
                setTab(value);
                setPage(1);
              }}
            >
              {value}
              {value === "All customers" && <span>{customers.length}</span>}
            </button>
          ))}
        </div>
        <div className="table-toolbar">
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label="Search customers"
              placeholder="Search name, city or profession"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {search && (
              <button
                className="icon-button"
                aria-label="Clear search"
                onClick={() => setSearch("")}
              >
                <X size={14} />
              </button>
            )}
          </label>
          <div className="toolbar-right">
            <span>
              {filtered.length}{" "}
              {filtered.length === 1 ? "customer" : "customers"}
            </span>
            <button
              className={`button secondary compact ${filters ? "selected" : ""}`}
              onClick={() => setFilters(!filters)}
              aria-expanded={filters}
            >
              Filters
              {city !== "All cities" || verification !== "All profiles"
                ? " · Applied"
                : ""}
            </button>
          </div>
        </div>
        {filters && (
          <div className="filter-panel">
            <label>
              City
              <select
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setPage(1);
                }}
              >
                <option>All cities</option>
                {[...new Set(customers.map((c) => c.profile.city))]
                  .sort()
                  .map((value) => (
                    <option key={value}>{value}</option>
                  ))}
              </select>
            </label>
            <label>
              Verification
              <select
                value={verification}
                onChange={(e) => {
                  setVerification(e.target.value);
                  setPage(1);
                }}
              >
                <option>All profiles</option>
                <option>Verified</option>
                <option>Pending</option>
              </select>
            </label>
            <button className="text-button" onClick={reset}>
              Reset filters
            </button>
          </div>
        )}
        <div className="table-scroll">
          <table className="customer-table">
            <thead>
              <tr>
                <th aria-sort={descending ? "descending" : "ascending"}>
                  <button
                    className="table-sort"
                    onClick={() => setDescending(!descending)}
                  >
                    Customer
                    <ArrowDown
                      size={13}
                      className={descending ? "flipped" : ""}
                    />
                  </button>
                </th>
                <th>Age / Gender</th>
                <th>City</th>
                <th>Marital status</th>
                <th>Verification</th>
                <th>Journey stage</th>
                <th>
                  <span className="sr-only">Open customer</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((customer) => {
                const p = customer.profile;
                return (
                  <tr key={customer.id}>
                    <td>
                      <Link
                        className="customer-name-cell"
                        to={`/customers/${customer.id}`}
                      >
                        <Avatar name={fullName(p)} id={p.id} />
                        <span>
                          <strong>{fullName(p)}</strong>
                          <small>{p.designation}</small>
                        </span>
                      </Link>
                    </td>
                    <td>
                      {age(p.dob)}
                      <span className="cell-subtle">
                        {" "}
                        / {p.gender === "Female" ? "F" : "M"}
                      </span>
                    </td>
                    <td>{p.city}</td>
                    <td>{p.maritalStatus}</td>
                    <td>
                      <Verified verified={p.verified} />
                    </td>
                    <td>
                      <StageTag stage={customer.stage} />
                    </td>
                    <td>
                      <Link
                        className="table-action"
                        to={`/customers/${customer.id}`}
                        aria-label={`View ${fullName(p)}`}
                      >
                        Open profile
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <Empty title="No customers found">
            Try another search or{" "}
            <button className="text-button" onClick={reset}>
              reset filters
            </button>
            .
          </Empty>
        )}
        <div className="pagination">
          <span>
            Showing{" "}
            <strong>
              {filtered.length ? (activePage - 1) * 7 + 1 : 0}–
              {Math.min(activePage * 7, filtered.length)}
            </strong>{" "}
            of {filtered.length}
          </span>
          <div>
            <button
              className="page-arrow"
              aria-label="Previous page"
              disabled={activePage === 1}
              onClick={() => setPage(activePage - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: maxPage }, (_, i) => (
              <button
                key={i}
                className={`page-number ${activePage === i + 1 ? "active" : ""}`}
                aria-label={`Page ${i + 1}`}
                aria-current={activePage === i + 1 ? "page" : undefined}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="page-arrow"
              aria-label="Next page"
              disabled={activePage === maxPage}
              onClick={() => setPage(activePage + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
