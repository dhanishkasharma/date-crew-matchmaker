import type { Profile } from "./schema";

export const POLICY_VERSION = "tdc-1.0";
export const weights = {
  lifePlans: 0.3,
  lifestyle: 0.25,
  location: 0.2,
  career: 0.15,
  communication: 0.1,
} as const;
export const componentLabels = {
  lifePlans: "Life plans",
  lifestyle: "Values & lifestyle",
  location: "Location & relocation",
  career: "Career & work style",
  communication: "Communication & interests",
};
type Component = keyof typeof weights;
type Evidence = { fit: number; known: boolean };
export type Breakdown = {
  key: Component;
  label: string;
  fit: number;
  coverage: number;
  weight: number;
};
export type Match = {
  candidate: Profile;
  score: number;
  coverage: number;
  customerFit: number;
  candidateFit: number;
  breakdown: Breakdown[];
  reasons: string[];
  questions: string[];
  band: "High potential" | "Worth exploring" | "Needs discussion";
};
export type MatchReport = {
  matches: Match[];
  pool: number;
  eligible: number;
  exclusions: Record<string, number>;
};

export function age(dob: string | null, now = new Date()): number | null {
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const date = new Date(`${dob}T00:00:00Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== dob ||
    date > now
  )
    return null;
  return (
    now.getUTCFullYear() -
    date.getUTCFullYear() -
    (now.getUTCMonth() < date.getUTCMonth() ||
    (now.getUTCMonth() === date.getUTCMonth() &&
      now.getUTCDate() < date.getUTCDate())
      ? 1
      : 0)
  );
}

const known = (fit: number): Evidence => ({ fit, known: true });
const unknown = (): Evidence => ({ fit: 0.5, known: false });
const overlap = (a: string[], b: string[]) => a.filter((v) => b.includes(v));
const same = (
  a: string | null,
  b: string | null,
  flexible?: string,
): Evidence =>
  !a || !b
    ? unknown()
    : known(a === b ? 1 : a === flexible || b === flexible ? 0.5 : 0);
const ratio = (a: string[], b: string[]): Evidence =>
  !a.length || !b.length ? unknown() : known(overlap(a, b).length / a.length);

export function feasibleCities(profile: Profile): string[] {
  return [
    ...new Set([
      profile.city,
      ...(profile.relocate === "Yes" ? profile.relocationCities : []),
    ]),
  ];
}
export function locationFit(a: Profile, b: Profile): Evidence {
  const aCities = a.preferences.cities.length
    ? feasibleCities(a).filter((c) => a.preferences.cities.includes(c))
    : feasibleCities(a);
  const bCities = b.preferences.cities.length
    ? feasibleCities(b).filter((c) => b.preferences.cities.includes(c))
    : feasibleCities(b);
  if (overlap(aCities, bCities).length) return known(1);
  if (
    a.relocate === "Maybe" ||
    b.relocate === "Maybe" ||
    a.relocate === null ||
    b.relocate === null ||
    (a.relocate === "Yes" && !a.relocationCities.length) ||
    (b.relocate === "Yes" && !b.relocationCities.length)
  )
    return unknown();
  return known(0);
}

function preferenceExclusions(a: Profile, b: Profile, now: Date): string[] {
  const errors: string[] = [];
  const partnerAge = age(b.dob, now);
  if (
    a.preferences.strictAge &&
    (partnerAge === null ||
      partnerAge < a.preferences.minAge ||
      partnerAge > a.preferences.maxAge)
  )
    errors.push("Age dealbreaker");
  if (!a.preferences.maritalStatuses.includes(b.maritalStatus))
    errors.push("Marital status preference");
  if (a.preferences.strictLocation && locationFit(a, b).fit !== 1)
    errors.push("Location dealbreaker");
  if (
    a.preferences.strictDiet &&
    a.preferences.diet !== "Any" &&
    a.preferences.diet !== b.diet
  )
    errors.push("Diet dealbreaker");
  if (
    a.preferences.strictSmoking &&
    a.preferences.smoking !== "Any" &&
    a.preferences.smoking !== b.smoking
  )
    errors.push("Smoking dealbreaker");
  return errors;
}

export function eligibility(
  customer: Profile,
  candidate: Profile,
  now = new Date(),
): string[] {
  const errors: string[] = [];
  if (customer.id === candidate.id) errors.push("Same profile");
  if (customer.gender === candidate.gender) errors.push("Outside partner pool");
  if (!candidate.verified) errors.push("Awaiting verification");
  if (!candidate.active || !candidate.available) errors.push("Unavailable");
  const candidateAge = age(candidate.dob, now);
  if (candidateAge === null || candidateAge < 18)
    errors.push("Invalid adult date of birth");
  if (
    customer.wantKids &&
    candidate.wantKids &&
    customer.wantKids !== "Maybe" &&
    candidate.wantKids !== "Maybe" &&
    customer.wantKids !== candidate.wantKids
  )
    errors.push("Children plans conflict");
  errors.push(
    ...preferenceExclusions(customer, candidate, now),
    ...preferenceExclusions(candidate, customer, now),
  );
  // These strict comparisons implement the brief's named male-customer policy.
  // They are not inferred preferences of all male candidate profiles.
  if (customer.gender === "Male") {
    if (
      age(customer.dob, now) === null ||
      !candidate.dob ||
      !customer.dob ||
      candidate.dob <= customer.dob
    )
      errors.push("Assessment policy: younger");
    if (
      customer.height === null ||
      candidate.height === null ||
      candidate.height >= customer.height
    )
      errors.push("Assessment policy: shorter");
    if (
      customer.income === null ||
      candidate.income === null ||
      candidate.income >= customer.income ||
      customer.currency !== candidate.currency ||
      customer.incomePeriod !== candidate.incomePeriod
    )
      errors.push("Assessment policy: lower comparable income");
    if (
      customer.wantKids === null ||
      candidate.wantKids === null ||
      customer.wantKids !== candidate.wantKids
    )
      errors.push("Assessment policy: same children views");
  }
  return [...new Set(errors)];
}

function directional(
  a: Profile,
  b: Profile,
): { score: number; coverage: number; breakdown: Breakdown[] } {
  const childFit =
    !a.wantKids || !b.wantKids
      ? unknown()
      : known(
          a.wantKids === "Maybe" || b.wantKids === "Maybe"
            ? 0.5
            : a.wantKids === b.wantKids
              ? 1
              : 0,
        );
  const partnerAge = age(b.dob);
  const groups: Record<Component, Evidence[]> = {
    lifePlans: [
      childFit,
      same(a.timeline, b.timeline, "Open to discussing"),
      partnerAge === null
        ? unknown()
        : known(
            partnerAge >= a.preferences.minAge &&
              partnerAge <= a.preferences.maxAge
              ? 1
              : 0,
          ),
    ],
    lifestyle: [
      ratio(a.values, b.values),
      a.preferences.diet === "Any"
        ? known(1)
        : same(a.preferences.diet, b.diet),
      a.preferences.smoking === "Any"
        ? known(1)
        : same(a.preferences.smoking, b.smoking),
      same(a.drinking, b.drinking),
      same(a.livingArrangement, b.livingArrangement, "Flexible"),
      same(a.pets, b.pets, "Maybe"),
    ],
    location: [locationFit(a, b)],
    career: [
      b.careerSupport === null
        ? unknown()
        : known(
            b.careerSupport === "Yes"
              ? 1
              : b.careerSupport === "Maybe"
                ? 0.5
                : 0,
          ),
      same(a.workStyle, b.workStyle, "Flexible"),
    ],
    communication: [
      !a.languages.length || !b.languages.length
        ? unknown()
        : known(overlap(a.languages, b.languages).length ? 1 : 0),
      ratio(a.interests, b.interests),
    ],
  };
  const breakdown = (Object.keys(weights) as Component[]).map((key) => ({
    key,
    label: componentLabels[key],
    weight: weights[key],
    fit: groups[key].reduce((n, e) => n + e.fit, 0) / groups[key].length,
    coverage: groups[key].filter((e) => e.known).length / groups[key].length,
  }));
  return {
    score: 100 * breakdown.reduce((n, g) => n + g.fit * g.weight, 0),
    coverage: 100 * breakdown.reduce((n, g) => n + g.coverage * g.weight, 0),
    breakdown,
  };
}

export function harmonicMean(a: number, b: number): number {
  return a + b === 0 ? 0 : (2 * a * b) / (a + b);
}

export function scorePair(customer: Profile, candidate: Profile): Match {
  const forward = directional(customer, candidate),
    backward = directional(candidate, customer);
  const score = Math.round(harmonicMean(forward.score, backward.score));
  const coverage = Math.round(Math.min(forward.coverage, backward.coverage));
  const reasons: string[] = [],
    questions: string[] = [];
  if (
    customer.wantKids &&
    customer.wantKids === candidate.wantKids &&
    customer.wantKids !== "Maybe"
  )
    reasons.push(
      customer.wantKids === "Yes"
        ? "Both see children in their future"
        : "Aligned on a life without children",
    );
  else questions.push("Talk through your expectations around children.");
  const cities = overlap(feasibleCities(customer), feasibleCities(candidate));
  if (locationFit(customer, candidate).fit === 1)
    reasons.push(`A shared future in ${cities[0] || customer.city}`);
  else questions.push("Confirm a city and a realistic relocation plan.");
  const sharedValues = overlap(customer.values, candidate.values);
  if (sharedValues.length)
    reasons.push(
      `Shared values: ${sharedValues.slice(0, 2).join(" & ").toLowerCase()}`,
    );
  const interests = overlap(customer.interests, candidate.interests);
  if (interests.length)
    reasons.push(
      `Connect over ${interests.slice(0, 2).join(" and ").toLowerCase()}`,
    );
  if (customer.timeline !== candidate.timeline)
    questions.push("Discuss the difference in marriage timelines.");
  if (coverage < 80)
    questions.push("Complete the missing profile information before deciding.");
  return {
    candidate,
    score,
    coverage,
    customerFit: Math.round(forward.score),
    candidateFit: Math.round(backward.score),
    breakdown: forward.breakdown.map((g, i) => ({
      ...g,
      fit: harmonicMean(g.fit, backward.breakdown[i].fit),
      coverage: Math.min(g.coverage, backward.breakdown[i].coverage),
    })),
    reasons: reasons.slice(0, 3),
    questions,
    band:
      score >= 80 &&
      coverage >= 80 &&
      !questions.some((q) => q.includes("children") || q.includes("city"))
        ? "High potential"
        : score >= 65 && coverage >= 60
          ? "Worth exploring"
          : "Needs discussion",
  };
}

export function rankMatches(
  customer: Profile,
  pool: Profile[],
  now = new Date(),
): MatchReport {
  const candidates = pool.filter((p) => p.gender !== customer.gender);
  const exclusions: Record<string, number> = {},
    matches: Match[] = [];
  for (const candidate of candidates) {
    const errors = eligibility(customer, candidate, now);
    if (errors.length) {
      for (const error of errors)
        exclusions[error] = (exclusions[error] ?? 0) + 1;
    } else matches.push(scorePair(customer, candidate));
  }
  matches.sort(
    (a, b) =>
      b.score - a.score ||
      b.coverage - a.coverage ||
      a.candidate.id.localeCompare(b.candidate.id),
  );
  return {
    matches,
    pool: candidates.length,
    eligible: matches.length,
    exclusions,
  };
}
