import {
  REVIEW_LIMIT,
  reviewOutputSchema,
  type EvidenceFact,
  type ShortlistReview,
} from "../shared/ai";
import {
  POLICY_VERSION,
  locationFit,
  type MatchReport,
  type Match,
} from "../shared/matching";
import type { Profile } from "../shared/schema";
import { config } from "./config";
import { fingerprint, generateStructured } from "./ai";

const PROMPT_VERSION = "review-2";
const cache = new Map<
  string,
  { expires: number; result: Promise<ShortlistReview> }
>();
const safeText = (value: string) =>
  value
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[contact omitted]")
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, "[contact omitted]")
    .slice(0, 300);
const display = (value: string | string[] | null) =>
  safeText(
    Array.isArray(value)
      ? value.join(", ") || "Not provided"
      : value || "Not provided",
  );

function explainEvidence(facts: EvidenceFact[], concerns: string[]) {
  const label = (fact: EvidenceFact) =>
    fact.label === "Supports partner’s career"
      ? "career support"
      : fact.label.toLowerCase();
  const aligned = facts.filter((fact) => fact.kind === "alignment").map(label);
  const unresolved = facts
    .filter((fact) => fact.kind === "discussion")
    .map(label);
  const lead = aligned.length
    ? `Review their recorded alignment on ${aligned.join(", ")}.`
    : "Compare their stated priorities in the profile evidence below.";
  const next = unresolved.length
    ? `Confirm ${unresolved.join(", ")} before deciding.`
    : concerns.length
      ? "Keep the open questions below in view before an introduction."
      : "Use these shared starting points to guide a first conversation.";
  return `${lead} ${next}`;
}

export function pairEvidence(a: Profile, match: Match): EvidenceFact[] {
  const b = match.candidate;
  const facts: EvidenceFact[] = [];
  const add = (
    key: string,
    label: string,
    customer: string | string[] | null,
    candidate: string | string[] | null,
    kind: EvidenceFact["kind"] = "context",
  ) => {
    facts.push({
      id: `${b.id}:${key}`,
      label,
      customer: display(customer),
      candidate: display(candidate),
      kind,
    });
  };
  const agreement = (x: string | null, y: string | null, flexible?: string) =>
    x && y && x === y && x !== flexible
      ? ("alignment" as const)
      : ("discussion" as const);
  add(
    "children",
    "Children plans",
    a.wantKids,
    b.wantKids,
    agreement(a.wantKids, b.wantKids, "Maybe"),
  );
  add(
    "timeline",
    "Marriage timeline",
    a.timeline,
    b.timeline,
    agreement(a.timeline, b.timeline, "Open to discussing"),
  );
  add(
    "location",
    "Location & relocation",
    `${a.city}; relocate: ${a.relocate ?? "Not provided"}; options: ${a.relocationCities.join(", ") || "Not provided"}; preferred cities: ${a.preferences.cities.join(", ") || "Any"}`,
    `${b.city}; relocate: ${b.relocate ?? "Not provided"}; options: ${b.relocationCities.join(", ") || "Not provided"}; preferred cities: ${b.preferences.cities.join(", ") || "Any"}`,
    locationFit(a, b).fit === 1 ? "alignment" : "discussion",
  );
  add(
    "values",
    "Declared values",
    a.values,
    b.values,
    a.values.some((v) => b.values.includes(v)) ? "alignment" : "context",
  );
  add(
    "interests",
    "Interests",
    a.interests,
    b.interests,
    a.interests.some((v) => b.interests.includes(v)) ? "alignment" : "context",
  );
  add(
    "work",
    "Work schedule",
    a.workStyle,
    b.workStyle,
    agreement(a.workStyle, b.workStyle, "Flexible"),
  );
  add("career", "Stated career priorities", a.careerPriority, b.careerPriority);
  add(
    "support",
    "Supports partner’s career",
    a.careerSupport,
    b.careerSupport,
    agreement(a.careerSupport, b.careerSupport, "Maybe"),
  );
  add(
    "home",
    "Family living arrangement",
    a.livingArrangement,
    b.livingArrangement,
    agreement(a.livingArrangement, b.livingArrangement, "Flexible"),
  );
  add(
    "pets",
    "Open to pets",
    a.pets,
    b.pets,
    agreement(a.pets, b.pets, "Maybe"),
  );
  add("bio", "In their own words", a.bio, b.bio);
  return facts;
}

export function buildReviewInput(customer: Profile, report: MatchReport) {
  return {
    customer: { firstName: safeText(customer.firstName) },
    eligible: report.eligible,
    candidates: report.matches.slice(0, REVIEW_LIMIT).map((match) => ({
      candidateId: match.candidate.id,
      firstName: safeText(match.candidate.firstName),
      mutualFit: match.score,
      coverage: match.coverage,
      concerns: match.questions,
      evidence: pairEvidence(customer, match),
    })),
  };
}

export async function reviewShortlist(
  ownerId: string,
  customerId: string,
  customer: Profile,
  report: MatchReport,
): Promise<ShortlistReview> {
  const input = buildReviewInput(customer, report);
  const fallback = (notice: string): ShortlistReview => ({
    source: "rules",
    summary: "Your shortlist remains ordered by mutual fit.",
    items: [],
    reviewed: input.candidates.length,
    generatedAt: new Date().toISOString(),
    notice,
  });
  if (!input.candidates.length)
    return fallback(
      "There are no eligible candidates to review. Check the saved preferences first.",
    );
  if (!config.geminiKey)
    return fallback(
      "AI is not connected. Your mutual-fit shortlist is still available.",
    );
  const key = fingerprint({
    ownerId,
    customerId,
    input,
    model: config.model,
    policy: POLICY_VERSION,
    prompt: PROMPT_VERSION,
  });
  for (const [id, entry] of cache)
    if (entry.expires < Date.now()) cache.delete(id);
  const existing = cache.get(key);
  if (existing) return existing.result;
  if (cache.size >= 40) cache.delete(cache.keys().next().value!);
  const result = (async () => {
    try {
      const output = await generateStructured({
        task: "shortlist-review",
        schema: reviewOutputSchema,
        tokens: 4096,
        instruction:
          "You assist a professional matchmaker at The Date Crew. Review ONLY the supplied eligible candidates. Return every supplied candidate exactly once, in the order a matchmaker should review them. Weigh declared life plans, practical location, mutual support, interests and remaining uncertainty. Existing concerns must remain unresolved; a high score is not certainty. For each candidate select 1–3 of THAT candidate's evidence IDs that best explain the review priority, including a relevant discussion/context fact when there is an important tradeoff. The application will render factual explanations from these references; do not write additional candidate claims. Write a specific, open discussion question without asserting unprovided facts. A context fact is not proof of alignment. Do not invent scores, diagnoses, facts or eligibility decisions. Do not claim a match is guaranteed. Keep the overall summary concise and avoid generalizations about background or personality.",
        input,
      });
      const ids = output.items.map((item) => item.candidateId);
      if (
        ids.length !== input.candidates.length ||
        new Set(ids).size !== ids.length
      )
        throw new Error("Invalid review membership");
      const items = output.items.map((item) => {
        const candidate = input.candidates.find(
          (c) => c.candidateId === item.candidateId,
        );
        if (
          !candidate ||
          new Set(item.evidenceIds).size !== item.evidenceIds.length ||
          item.evidenceIds.some(
            (id) => !candidate.evidence.some((f) => f.id === id),
          )
        )
          throw new Error("Unsupported review evidence");
        const facts = candidate.evidence.filter((f) =>
          item.evidenceIds.includes(f.id),
        );
        return {
          ...item,
          rationale: explainEvidence(facts, candidate.concerns),
          facts,
          concerns: candidate.concerns,
        };
      });
      return {
        source: "ai" as const,
        summary: output.summary,
        items,
        reviewed: items.length,
        generatedAt: new Date().toISOString(),
      };
    } catch {
      cache.delete(key);
      return fallback(
        "AI could not review the shortlist. Your mutual-fit order is unchanged; you can retry the review.",
      );
    }
  })();
  cache.set(key, { expires: Date.now() + 10 * 60000, result });
  return result;
}
