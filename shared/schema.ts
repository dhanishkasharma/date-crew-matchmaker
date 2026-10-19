import { z } from "zod";
import { stages } from "./constants";

export const choiceSchema = z.enum(["Yes", "No", "Maybe"]);
export const stageSchema = z.enum(stages);
export const preferencesSchema = z
  .object({
    minAge: z.number().int().min(18).max(80),
    maxAge: z.number().int().min(18).max(80),
    strictAge: z.boolean(),
    cities: z.array(z.string().min(1)).max(10),
    strictLocation: z.boolean(),
    maritalStatuses: z
      .array(z.enum(["Never married", "Divorced", "Widowed"]))
      .min(1),
    diet: z.enum(["Any", "Vegetarian", "Non-vegetarian", "Vegan"]),
    strictDiet: z.boolean(),
    smoking: z.enum(["Any", "No", "Occasionally"]),
    strictSmoking: z.boolean(),
  })
  .refine((v) => v.minAge <= v.maxAge, {
    message: "Minimum age cannot exceed maximum age",
    path: ["maxAge"],
  });

export const profileSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  gender: z.enum(["Male", "Female"]),
  dob: z.string().nullable(),
  country: z.string(),
  city: z.string(),
  height: z.number().nullable(),
  email: z.string().email(),
  phone: z.string(),
  college: z.string(),
  degree: z.string(),
  income: z.number().nullable(),
  currency: z.string(),
  incomePeriod: z.string(),
  company: z.string(),
  designation: z.string(),
  maritalStatus: z.enum(["Never married", "Divorced", "Widowed"]),
  languages: z.array(z.string()),
  siblings: z.string(),
  caste: z.string().nullable(),
  religion: z.string().nullable(),
  wantKids: choiceSchema.nullable(),
  relocate: choiceSchema.nullable(),
  pets: choiceSchema.nullable(),
  motherTongue: z.string(),
  bio: z.string(),
  interests: z.array(z.string()),
  values: z.array(z.string()),
  diet: z.enum(["Vegetarian", "Non-vegetarian", "Vegan"]).nullable(),
  smoking: z.enum(["No", "Occasionally"]).nullable(),
  drinking: z.enum(["No", "Socially"]).nullable(),
  existingChildren: z.number().int().nonnegative(),
  timeline: z
    .enum(["Within a year", "1–2 years", "Open to discussing"])
    .nullable(),
  livingArrangement: z
    .enum(["Independent", "With family", "Flexible"])
    .nullable(),
  workStyle: z.enum(["Flexible", "Regular hours", "Variable hours"]).nullable(),
  careerSupport: choiceSchema.nullable(),
  careerPriority: z.string(),
  relocationCities: z.array(z.string()),
  verified: z.boolean(),
  active: z.boolean(),
  available: z.boolean(),
  preferences: preferencesSchema,
});
export type Profile = z.infer<typeof profileSchema>;
export type Preferences = z.infer<typeof preferencesSchema>;
export type Stage = z.infer<typeof stageSchema>;
export type Customer = {
  id: string;
  profile: Profile;
  ownerId: string;
  stage: Stage;
  updatedAt: string;
};
export type Note = {
  id: string;
  customerId: string;
  type: "Meeting" | "Call" | "Note";
  text: string;
  author: string;
  createdAt: string;
};
export type Send = {
  id: string;
  customerId: string;
  candidateId: string;
  subject: string;
  introduction: string;
  source: "gemini" | "template" | "edited";
  createdAt: string;
  policyVersion: string;
};
export type User = { id: string; name: string; username: string; role: string };
export type Bootstrap = {
  user: User;
  customers: Customer[];
  candidates: Profile[];
  notes: Note[];
  sends: Send[];
  aiConfigured: boolean;
  storage: "atlas" | "local";
};
export const introSchema = z.object({
  subject: z.string().min(5).max(160),
  introduction: z.string().min(30).max(1600),
  discussionQuestion: z.string().max(300),
});
export type Introduction = z.infer<typeof introSchema> & {
  source: "gemini" | "template";
  notice?: string;
};
