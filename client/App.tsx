import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { ChevronRight, Menu, X } from "lucide-react";
import type { Bootstrap } from "../shared/schema";
import { api, ApiError, post } from "./api";
import { Avatar, Brand, Empty, Modal, Spinner } from "./components";
import { Login } from "./Login";
import { Dashboard } from "./Dashboard";
const CustomerView = lazy(() =>
  import("./CustomerView").then((module) => ({ default: module.CustomerView })),
);
const Pool = lazy(() =>
  import("./SecondaryViews").then((module) => ({ default: module.Pool })),
);
const ActivityView = lazy(() =>
  import("./SecondaryViews").then((module) => ({
    default: module.ActivityView,
  })),
);

export function App() {
  const [data, setData] = useState<Bootstrap | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [menu, setMenu] = useState(false),
    [help, setHelp] = useState(false);
  const location = useLocation();
  const reload = useCallback(async () => {
    try {
      setData(await api<Bootstrap>("/bootstrap"));
      setError("");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setData(null);
        setError("");
      } else {
        setError(error instanceof Error ? error.message : "Unable to connect.");
        throw error;
      }
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload().catch(() => {});
  }, [reload]);
  useEffect(() => {
    const expired = () => {
      setData(null);
      setError("");
    };
    window.addEventListener("tdc-session-expired", expired);
    return () => window.removeEventListener("tdc-session-expired", expired);
  }, []);
  useEffect(() => {
    setMenu(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  const notify = (message: string) => setToast(message);
  if (loading) return <Spinner />;
  if (!data)
    return error ? (
      <div className="connection-error">
        <Brand />
        <Empty title="Unable to load the workspace">{error}</Empty>
        <button
          className="button primary"
          onClick={() => {
            setLoading(true);
            void reload().catch(() => {});
          }}
        >
          Retry connection
        </button>
      </div>
    ) : (
      <Login onLogin={reload} />
    );
  const title = location.pathname.startsWith("/customers/")
    ? "Customer profile"
    : location.pathname === "/pool"
      ? "Candidate pool"
      : location.pathname === "/activity"
        ? "Activity"
        : "Customers";
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {menu && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={`sidebar ${menu ? "sidebar-open" : ""}`}>
        <Link to="/customers" className="brand-link">
          <Brand />
        </Link>
        <button
          className="mobile-close icon-button"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        >
          <X size={20} />
        </button>
        <div className="workspace-label">Matchmaking operations</div>
        <nav aria-label="Main navigation">
          <NavLink to="/customers">
            Customers<span className="nav-count">{data.customers.length}</span>
          </NavLink>
          <NavLink to="/pool">
            Candidate pool
            <span className="nav-count">{data.candidates.length}</span>
          </NavLink>
          <NavLink to="/activity">Activity</NavLink>
        </nav>
        <div className="sidebar-bottom">
          <button className="help-button" onClick={() => setHelp(true)}>
            How matching works
          </button>
          <div className="sidebar-person">
            <Avatar name={data.user.name} />
            <div>
              <strong>{data.user.name}</strong>
              <small>{data.user.role}</small>
            </div>
          </div>
          <button
            className="signout-button"
            onClick={async () => {
              try {
                await post("/auth/logout", {});
                setData(null);
              } catch (error) {
                notify(
                  error instanceof Error
                    ? error.message
                    : "Unable to sign out.",
                );
              }
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setMenu(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{title}</strong>
          </div>
          <div className="topbar-right">
            <span className="demo-indicator">Assessment demo</span>
            <span className="topbar-date">
              {new Date().toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </header>
        <main id="main-content" className="page-content">
          {error && (
            <p role="alert" className="error-banner">
              {error}
              <button onClick={() => void reload().catch(() => {})}>
                Retry
              </button>
            </p>
          )}
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/customers" element={<Dashboard data={data} />} />
              <Route
                path="/customers/:id"
                element={
                  <CustomerView data={data} reload={reload} notify={notify} />
                }
              />
              <Route path="/pool" element={<Pool data={data} />} />
              <Route path="/activity" element={<ActivityView data={data} />} />
              <Route path="*" element={<Navigate to="/customers" replace />} />
            </Routes>
          </Suspense>
          <footer className="page-footer">
            <span>TDC Matchmaker</span>
            <span>Fictional profiles. All email sends are simulated.</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {help && (
        <Modal
          title="How matching works"
          subtitle="Eligibility rules, mutual fit, and introduction review."
          onClose={() => setHelp(false)}
        >
          <div className="help-content">
            <h3>Eligibility before ranking</h3>
            <p>
              Candidates must be verified, available, and meet both people’s
              firm preferences. For male customers, the assessment also requires
              younger age, shorter height, lower comparable income, and matching
              views on children.
            </p>
            <h3>Mutual compatibility</h3>
            <p>
              Life plans contribute 30%, values and lifestyle 25%, location 20%,
              career 15%, and communication 10%. The score considers preference
              fit in both directions. Evidence coverage shows how much profile
              information is available.
            </p>
            <h3>Reviewed introductions</h3>
            <p>
              AI drafts an introduction from selected profile facts. Review and
              edit the text before recording a mock email. Compatibility indices
              are not probabilities of relationship success.
            </p>
            <h3>AI assistance, with your review</h3>
            <p>
              Review with AI compares eight eligible candidates and highlights
              saved evidence. You can switch between its suggested review order
              and mutual-fit order. Describe with AI previews preference
              changes; nothing is saved until you apply them. Firm eligibility
              rules stay in place.
            </p>
            <span className="subtle-chip">Policy tdc-1.0</span>
          </div>
        </Modal>
      )}
    </div>
  );
}
