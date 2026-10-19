import type { Profile } from "../shared/schema";
import { age } from "../shared/matching";
import { money } from "./format";

function Details({
  title,
  fields,
}: {
  title: string;
  fields: [string, string | number | null | undefined][];
}) {
  return (
    <section className="info-card">
      <h3>{title}</h3>
      <dl>
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              {value === null || value === undefined || value === "" ? (
                <span className="not-provided">Not provided</span>
              ) : (
                value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
export function ProfileDetails({ profile: p }: { profile: Profile }) {
  return (
    <div className="profile-details">
      <section className="about-card">
        <h3>About</h3>
        <p>{p.bio}</p>
        <div className="tag-list">
          {p.interests.map((value) => (
            <span key={value}>{value}</span>
          ))}
        </div>
      </section>
      <div className="info-grid">
        <Details
          title="Personal details"
          fields={[
            ["First name", p.firstName],
            ["Last name", p.lastName],
            ["Gender", p.gender],
            ["Date of birth", p.dob],
            ["Age", age(p.dob)],
            ["Height", p.height === null ? null : `${p.height} cm`],
            ["Marital status", p.maritalStatus],
            ["Country", p.country],
            ["City", p.city],
            ["Email", p.email],
            ["Phone", p.phone],
          ]}
        />
        <Details
          title="Education & career"
          fields={[
            ["Undergraduate college", p.college],
            ["Degree", p.degree],
            ["Current company", p.company],
            ["Designation", p.designation],
            ["Annual income", money(p)],
            ["Work schedule", p.workStyle],
            ["Career priorities", p.careerPriority],
            ["Supports partner’s career", p.careerSupport],
          ]}
        />
        <Details
          title="Family & background"
          fields={[
            ["Mother tongue", p.motherTongue],
            ["Languages known", p.languages.join(", ")],
            ["Siblings", p.siblings],
            ["Religion", p.religion],
            ["Caste", p.caste],
            ["Existing children", p.existingChildren],
            ["Family living arrangement", p.livingArrangement],
          ]}
        />
        <Details
          title="Lifestyle & plans"
          fields={[
            ["Wants children", p.wantKids],
            ["Marriage timeline", p.timeline],
            ["Open to relocate", p.relocate],
            ["Relocation cities", p.relocationCities.join(", ")],
            ["Open to pets", p.pets],
            ["Diet", p.diet],
            ["Smoking", p.smoking],
            ["Drinking", p.drinking],
          ]}
        />
      </div>
      <section className="info-card values-card">
        <h3>Values</h3>
        <div className="tag-list">
          {p.values.map((value) => (
            <span key={value}>{value}</span>
          ))}
        </div>
        <p className="muted small">
          Values are self-declared. We never infer them from background or
          profession.
        </p>
      </section>
    </div>
  );
}
export function ProfileMini({ profile: p }: { profile: Profile }) {
  return (
    <div className="profile-mini">
      <span>
        {p.city}, {p.country}
      </span>
      <span>
        {p.designation} at {p.company}
      </span>
      <span>
        {p.degree} · {p.college}
      </span>
    </div>
  );
}
