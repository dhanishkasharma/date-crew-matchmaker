import { z } from "zod";
import { preferencesPatchSchema, type Preferences } from "./schema";

export const REVIEW_LIMIT = 8;
export const preferenceLabels: Record<keyof Preferences, string> = {
  minAge: "Minimum age",
  maxAge: "Maximum age",
  strictAge: "Firm age range",
  cities: "Preferred cities",
  strictLocation: "Firm common city",
  maritalStatuses: "Accepted marital statuses",
  diet: "Diet",
  strictDiet: "Firm diet preference",
  smoking: "Smoking",
  strictSmoking: "Firm smoking preference",
};
export type EvidenceFact = {
  id: string;
  label: string;
  customer: string;
  candidate: string;
  kind: "alignment" | "context" | "discussion";
};
export const reviewOutputSchema = z
  .object({
    summary: z.string().min(10).max(500),
    items: z
      .array(
        z
          .object({
            candidateId: z.string().min(1).max(100),
            evidenceIds: z.array(z.string().max(120)).min(1).max(3),
            question: z.string().min(5).max(240),
          })
          .strict(),
      )
      .min(1)
      .max(REVIEW_LIMIT),
  })
  .strict();
export type ShortlistReview = {
  source: "ai" | "rules";
  summary: string;
  items: (z.infer<typeof reviewOutputSchema>["items"][number] & {
    rationale: string;
    facts: EvidenceFact[];
    concerns: string[];
  })[];
  reviewed: number;
  generatedAt: string;
  notice?: string;
};
const preferenceKeySchema = z.enum(
  Object.keys(preferenceLabels) as [
    keyof Preferences,
    ...(keyof Preferences)[],
  ],
);
export const preferenceOutputSchema = z
  .object({
    patch: preferencesPatchSchema,
    evidence: z
      .array(
        z
          .object({
            field: preferenceKeySchema,
            quote: z.string().min(2).max(300),
          })
          .strict(),
      )
      .max(11),
    questions: z.array(z.string().min(5).max(240)).max(5),
    unsupported: z.array(z.string().min(3).max(240)).max(5),
  })
  .strict();
export type PreferenceChange = {
  field: keyof Preferences;
  label: string;
  before: string;
  after: string;
  quote: string;
};
export type PreferenceProposal = {
  status: "ready" | "clarify" | "unavailable";
  proposalId?: string;
  expiresAt?: string;
  before: Preferences;
  after: Preferences;
  changes: PreferenceChange[];
  eligibleBefore: number;
  eligibleAfter: number;
  questions: string[];
  unsupported: string[];
  notice?: string;
};
export function preferenceValue(value: Preferences[keyof Preferences]): string {
  if (Array.isArray(value))
    return value.length ? value.join(", ") : "Any feasible city";
  if (typeof value === "boolean") return value ? "Firm" : "Flexible";
  return String(value);
}
