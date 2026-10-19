import { useState, type FormEvent } from "react";
import type { Customer } from "../shared/schema";
import { cities } from "../shared/constants";
import { patch } from "./api";
import { Modal } from "./components";

export function PreferencesEditor({
  customer,
  close,
  saved,
}: {
  customer: Customer;
  close: () => void;
  saved: () => Promise<void>;
}) {
  const [form, setForm] = useState(
      structuredClone(customer.profile.preferences),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await patch(`/customers/${customer.id}/preferences`, form);
      await saved();
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save preferences.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Partner preferences"
      subtitle={`Partner preferences for ${customer.profile.firstName}. Strict preferences are never relaxed automatically.`}
      onClose={close}
    >
      <form className="preferences-form" onSubmit={submit}>
        <div className="form-section-title">Age range</div>
        <div className="form-row">
          <label>
            Minimum age
            <input
              type="number"
              min={18}
              max={80}
              value={form.minAge}
              onChange={(e) =>
                setForm({ ...form, minAge: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Maximum age
            <input
              type="number"
              min={18}
              max={80}
              value={form.maxAge}
              onChange={(e) =>
                setForm({ ...form, maxAge: Number(e.target.value) })
              }
            />
          </label>
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            checked={form.strictAge}
            onChange={(e) => setForm({ ...form, strictAge: e.target.checked })}
          />
          Make age a firm dealbreaker
        </label>
        <div className="form-section-title">Location</div>
        <p className="muted small">
          Select accepted cities. Leave empty for any feasible shared city.
        </p>
        <div className="choice-grid">
          {cities.map((city) => (
            <button
              type="button"
              aria-pressed={form.cities.includes(city)}
              key={city}
              className={
                form.cities.includes(city) ? "choice selected" : "choice"
              }
              onClick={() =>
                setForm({
                  ...form,
                  cities: form.cities.includes(city)
                    ? form.cities.filter((c) => c !== city)
                    : [...form.cities, city],
                })
              }
            >
              {city}
            </button>
          ))}
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            checked={form.strictLocation}
            onChange={(e) =>
              setForm({ ...form, strictLocation: e.target.checked })
            }
          />
          Require a confirmed, feasible common city
        </label>
        <div className="form-section-title">Accepted marital statuses</div>
        <div className="check-row">
          {(["Never married", "Divorced", "Widowed"] as const).map((status) => (
            <label key={status} className="check-label">
              <input
                type="checkbox"
                checked={form.maritalStatuses.includes(status)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maritalStatuses: e.target.checked
                      ? [...form.maritalStatuses, status]
                      : form.maritalStatuses.filter((v) => v !== status),
                  })
                }
              />
              {status}
            </label>
          ))}
        </div>
        <div className="form-row">
          <div>
            <label>
              Diet
              <select
                value={form.diet}
                onChange={(e) =>
                  setForm({ ...form, diet: e.target.value as typeof form.diet })
                }
              >
                {["Any", "Vegetarian", "Non-vegetarian", "Vegan"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={form.strictDiet}
                onChange={(e) =>
                  setForm({ ...form, strictDiet: e.target.checked })
                }
              />
              Firm dealbreaker
            </label>
          </div>
          <div>
            <label>
              Smoking
              <select
                value={form.smoking}
                onChange={(e) =>
                  setForm({
                    ...form,
                    smoking: e.target.value as typeof form.smoking,
                  })
                }
              >
                {["Any", "No", "Occasionally"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={form.strictSmoking}
                onChange={(e) =>
                  setForm({ ...form, strictSmoking: e.target.checked })
                }
              />
              Firm dealbreaker
            </label>
          </div>
        </div>
        {customer.profile.gender === "Male" && (
          <div className="inline-notice">
            The assessment policy also requires younger age, shorter height,
            lower comparable income, and identical children preferences. These
            rules stay in place.
          </div>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="button primary" disabled={busy}>
            {busy ? "Saving…" : "Save preferences"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
