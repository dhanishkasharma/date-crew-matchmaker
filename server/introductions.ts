import { introSchema, type Introduction, type Profile } from "../shared/schema";
import { type Match } from "../shared/matching";
import { templateIntroduction } from "../shared/introduction";
import { config } from "./config";
import { generateStructured } from "./ai";

export async function generateIntroduction(
  customer: Profile,
  match: Match,
): Promise<Introduction> {
  if (!config.geminiKey)
    return templateIntroduction(
      customer,
      match,
      "Live AI is not connected. A template introduction is ready for your review.",
    );
  const safeProfile = (p: Profile) => ({
    firstName: p.firstName,
    city: p.city,
    profession: p.designation,
    interests: p.interests,
    values: p.values,
  });
  try {
    const draft = await generateStructured({
      task: "introduction",
      schema: introSchema,
      instruction:
        "Write a warm professional matchmaking email for The Date Crew. Address the customer by first name. Write a 60–90 word introduction and one short discussion question. Never invent profile facts.",
      input: {
        customer: safeProfile(customer),
        candidate: safeProfile(match.candidate),
        facts: match.reasons,
        discussionPoints: match.questions,
      },
    });
    return { ...draft, source: "gemini" };
  } catch {
    return templateIntroduction(
      customer,
      match,
      "AI could not generate a draft. Your template is ready to review; you can retry AI generation.",
    );
  }
}
