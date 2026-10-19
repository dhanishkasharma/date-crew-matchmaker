import { afterEach, describe, expect, it, vi } from "vitest";
import { createSeed } from "../shared/seed";
import { scorePair } from "../shared/matching";
import { config } from "../server/config";
import { generateIntroduction } from "../server/introductions";

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock("@google/genai", () => ({
  ThinkingLevel: { LOW: "LOW" },
  GoogleGenAI: class {
    models = { generateContent };
  },
}));
const originalKey = config.geminiKey;
afterEach(() => {
  config.geminiKey = originalKey;
  vi.clearAllMocks();
});
const fixture = () => {
  const seed = createSeed();
  const customer = seed.clients[0];
  return { customer, match: scorePair(customer, seed.candidates[100]) };
};

describe("Gemini introduction boundary", () => {
  it("uses a labeled template without making a provider call if no key exists", async () => {
    config.geminiKey = "";
    const { customer, match } = fixture();
    expect((await generateIntroduction(customer, match)).source).toBe(
      "template",
    );
    expect(generateContent).not.toHaveBeenCalled();
  });
  it("validates structured output and sends only the limited profile context", async () => {
    config.geminiKey = "unit-test-only";
    generateContent.mockResolvedValue({
      text: JSON.stringify({
        subject: "Ananya, a thoughtful introduction",
        introduction:
          "Hi Ananya, you both share a love for reading and travel. Would you like to explore a first conversation?",
        discussionQuestion: "What do you enjoy reading?",
      }),
    });
    const { customer, match } = fixture();
    const result = await generateIntroduction(customer, match);
    expect(result.source).toBe("gemini");
    const contents = generateContent.mock.calls[0][0].contents as string;
    expect(contents).not.toContain(customer.email);
    expect(contents).not.toContain(customer.phone);
    expect(contents).not.toContain(customer.dob!);
    const payload = JSON.parse(contents);
    expect(Object.keys(payload.customer).sort()).toEqual([
      "city",
      "firstName",
      "interests",
      "profession",
      "values",
    ]);
  });
  it.each(["provider error", "invalid JSON", "invalid shape"])(
    "falls back honestly on %s",
    async (scenario) => {
      config.geminiKey = "unit-test-only";
      if (scenario === "provider error")
        generateContent.mockRejectedValue(new Error("Quota exceeded"));
      else
        generateContent.mockResolvedValue({
          text: scenario === "invalid JSON" ? "oops" : "{}",
        });
      const { customer, match } = fixture();
      const result = await generateIntroduction(customer, match);
      expect(result.source).toBe("template");
      expect(result.notice).toContain("could not generate");
    },
  );
});
