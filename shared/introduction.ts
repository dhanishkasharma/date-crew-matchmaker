import type { Introduction, Profile } from "./schema";
import { age, type Match } from "./matching";
export function templateIntroduction(
  customer: Profile,
  match: Match,
  notice?: string,
): Introduction {
  const candidate = match.candidate;
  const profession = candidate.designation.toLowerCase();
  const article = /^[aeiou]/.test(profession) ? "an" : "a";
  return {
    source: "template",
    subject: `${customer.firstName}, meet ${candidate.firstName}`,
    introduction: `Hi ${customer.firstName},\n\nI'd love to introduce you to ${candidate.firstName} ${candidate.lastName}, ${age(candidate.dob)}, ${article} ${profession} based in ${candidate.city}. ${match.reasons.slice(0, 2).join(". ")}. Their profile offers a thoughtful starting point for a conversation. Would you like to explore this connection?\n\nWarmly,\nYour TDC matchmaker`,
    discussionQuestion:
      match.questions[0] ||
      "What does a meaningful everyday life together look like to you?",
    notice,
  };
}
