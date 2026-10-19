import { describe, expect, it } from "vitest";
import {
  age,
  eligibility,
  harmonicMean,
  locationFit,
  rankMatches,
  scorePair,
} from "../shared/matching";
import { createSeed } from "../shared/seed";
import type { Profile } from "../shared/schema";

const now = new Date("2026-10-19T12:00:00Z");
function pair(): [Profile, Profile] {
  const seed = createSeed();
  const a = structuredClone(seed.clients[1]),
    b = structuredClone(seed.candidates[0]);
  Object.assign(a, {
    dob: "1993-02-12",
    height: 183,
    income: 4200000,
    city: "Mumbai",
    wantKids: "Yes",
    relocate: "No",
    pets: "Yes",
    timeline: "1–2 years",
    livingArrangement: "Independent",
    workStyle: "Regular hours",
    diet: "Vegetarian",
    smoking: "No",
    drinking: "No",
    careerSupport: "Yes",
    values: ["Family", "Kindness"],
    interests: ["Reading"],
    languages: ["Hindi", "English"],
  });
  Object.assign(b, {
    dob: "1996-07-12",
    height: 165,
    income: 1800000,
    city: "Mumbai",
    wantKids: "Yes",
    relocate: "No",
    pets: "Yes",
    timeline: "1–2 years",
    livingArrangement: "Independent",
    workStyle: "Regular hours",
    diet: "Vegetarian",
    smoking: "No",
    drinking: "No",
    careerSupport: "Yes",
    values: ["Family", "Kindness"],
    interests: ["Reading"],
    languages: ["Hindi", "English"],
    verified: true,
    active: true,
    available: true,
  });
  a.preferences = {
    minAge: 18,
    maxAge: 80,
    strictAge: false,
    cities: [],
    strictLocation: false,
    maritalStatuses: ["Never married", "Divorced", "Widowed"],
    diet: "Any",
    strictDiet: false,
    smoking: "Any",
    strictSmoking: false,
  };
  b.preferences = structuredClone(a.preferences);
  return [a, b];
}

describe("deterministic seed", () => {
  it("creates 100 candidates of each gender, separately from 12 customers", () => {
    const seed = createSeed();
    expect(seed.candidates.filter((p) => p.gender === "Male")).toHaveLength(
      100,
    );
    expect(seed.candidates.filter((p) => p.gender === "Female")).toHaveLength(
      100,
    );
    expect(seed.clients).toHaveLength(12);
    expect(
      new Set([...seed.candidates, ...seed.clients].map((p) => p.id)).size,
    ).toBe(212);
    expect(createSeed()).toEqual(seed);
  });
});
describe("age and male-customer eligibility", () => {
  it("handles birthday boundaries and invalid dates", () => {
    expect(age("2000-10-20", now)).toBe(25);
    expect(age("2000-10-19", now)).toBe(26);
    expect(age("2000-02-31", now)).toBeNull();
    expect(age("2030-01-01", now)).toBeNull();
  });
  it("accepts the explicitly compatible baseline pair", () => {
    const [a, b] = pair();
    expect(eligibility(a, b, now)).toEqual([]);
  });
  it.each([
    "same age",
    "equal height",
    "equal income",
    "missing income",
    "different currency",
    "different income period",
    "different children",
    "unknown children",
  ])("rejects %s under the assessment policy", (scenario) => {
    const [a, b] = pair();
    if (scenario === "same age") b.dob = a.dob;
    if (scenario === "equal height") b.height = a.height;
    if (scenario === "equal income") b.income = a.income;
    if (scenario === "missing income") b.income = null;
    if (scenario === "different currency") b.currency = "USD";
    if (scenario === "different income period") b.incomePeriod = "monthly";
    if (scenario === "different children") b.wantKids = "No";
    if (scenario === "unknown children") b.wantKids = null;
    expect(eligibility(a, b, now).length).toBeGreaterThan(0);
  });
  it("permits Maybe/Maybe but requires a children discussion and prevents High potential", () => {
    const [a, b] = pair();
    a.wantKids = "Maybe";
    b.wantKids = "Maybe";
    expect(eligibility(a, b, now)).toEqual([]);
    expect(scorePair(a, b).questions).toContain(
      "Talk through your expectations around children.",
    );
    expect(scorePair(a, b).band).not.toBe("High potential");
  });
  it.each(["unverified", "unavailable", "inactive", "same gender"])(
    "filters %s candidates",
    (scenario) => {
      const [a, b] = pair();
      if (scenario === "unverified") b.verified = false;
      if (scenario === "unavailable") b.available = false;
      if (scenario === "inactive") b.active = false;
      if (scenario === "same gender") b.gender = "Male";
      expect(eligibility(a, b, now).length).toBeGreaterThan(0);
    },
  );
});
describe("mutual preferences and scoring", () => {
  it("uses a flexible age range as a ranking preference without filtering", () => {
    const [a, b] = pair();
    const baseline = scorePair(a, b).score;
    a.preferences.minAge = 35;
    expect(eligibility(a, b, now)).toEqual([]);
    expect(scorePair(a, b).score).toBeLessThan(baseline);
  });
  it("does not impose male-policy salary, height, or age assumptions on female customers", () => {
    const [man, woman] = pair();
    man.income = 1000000;
    man.height = 160;
    man.dob = "2000-03-01";
    expect(eligibility(woman, man, now)).toEqual([]);
  });
  it("respects a candidate’s strict age preference in the reverse direction", () => {
    const [a, b] = pair();
    b.preferences.strictAge = true;
    b.preferences.maxAge = 30;
    expect(eligibility(a, b, now)).toContain("Age dealbreaker");
  });
  it("respects explicit marital, diet, and smoking dealbreakers", () => {
    const [a, b] = pair();
    a.preferences.maritalStatuses = ["Widowed"];
    a.preferences.diet = "Vegan";
    a.preferences.strictDiet = true;
    a.preferences.smoking = "Occasionally";
    a.preferences.strictSmoking = true;
    expect(eligibility(a, b, now)).toEqual(
      expect.arrayContaining([
        "Marital status preference",
        "Diet dealbreaker",
        "Smoking dealbreaker",
      ]),
    );
  });
  it("does not confuse two relocation Yes flags with an actual common city", () => {
    const [a, b] = pair();
    a.city = "Delhi";
    b.city = "Chennai";
    a.relocate = "Yes";
    b.relocate = "Yes";
    a.relocationCities = ["Mumbai"];
    b.relocationCities = ["Pune"];
    a.preferences.strictLocation = true;
    expect(locationFit(a, b).fit).toBe(0);
    expect(eligibility(a, b, now)).toContain("Location dealbreaker");
  });
  it("marks Maybe relocation unresolved and does not pass strict location", () => {
    const [a, b] = pair();
    a.city = "Delhi";
    b.city = "Chennai";
    a.relocate = "Maybe";
    a.preferences.strictLocation = true;
    expect(locationFit(a, b).known).toBe(false);
    expect(eligibility(a, b, now)).toContain("Location dealbreaker");
  });
  it("assigns 100 to a fully aligned, fully known baseline without pretending it is a probability", () => {
    const [a, b] = pair();
    const match = scorePair(a, b);
    expect(match.score).toBe(100);
    expect(match.coverage).toBe(100);
    expect(match.band).toBe("High potential");
    expect(match.reasons).toContain("Both see children in their future");
  });
  it("reduces a one-sided preference fit using the harmonic mean", () => {
    expect(harmonicMean(90, 60)).toBe(72);
    expect(harmonicMean(0, 0)).toBe(0);
  });
  it("keeps unknown fields at neutral fit with reduced coverage", () => {
    const [a, b] = pair();
    const before = scorePair(a, b);
    b.timeline = null;
    b.workStyle = null;
    b.careerSupport = null;
    const after = scorePair(a, b);
    expect(after.score).toBeLessThan(before.score);
    expect(after.coverage).toBeLessThan(before.coverage);
  });
  it("gives a known Any preference full coverage", () => {
    const [a, b] = pair();
    a.preferences.diet = "Any";
    b.diet = null;
    expect(
      scorePair(a, b).breakdown.find((p) => p.key === "lifestyle")?.coverage,
    ).toBe(1);
  });
  it("sorts ties stably by profile ID and ranks a better fit ahead of a conflicting soft preference", () => {
    const [a, b] = pair();
    const c = structuredClone(b);
    c.id = "a-candidate";
    const d = structuredClone(b);
    d.id = "z-candidate";
    d.timeline = "Within a year";
    expect(
      rankMatches(a, [b, d, c], now).matches.map((m) => m.candidate.id),
    ).toEqual([c.id, b.id, d.id]);
  });
});
