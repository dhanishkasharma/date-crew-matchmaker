import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

// Only print a safe error category; provider messages can contain credentials.
const model =
  process.argv.find((arg) => arg.startsWith("--model="))?.slice(8) ||
  process.env.GEMINI_MODEL ||
  "gemini-3.5-flash-lite";
if (!process.env.GEMINI_API_KEY) {
  console.info(JSON.stringify({ configured: false }));
  process.exit(1);
}
try {
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  if (process.argv.includes("--list")) {
    const pager = await client.models.list({ config: { pageSize: 100 } });
    const models = [];
    for await (const item of pager) {
      if (
        item.name?.includes("flash") &&
        !/image|audio|tts|live/.test(item.name)
      )
        models.push({ name: item.name, actions: item.supportedActions });
    }
    console.info(JSON.stringify({ availableFlashModels: models }));
    process.exit(0);
  }
  const result = await client.models.generateContent({
    model,
    contents: 'Return the JSON object {"ok": true}.',
    config: {
      responseMimeType: "application/json",
      maxOutputTokens: 100,
      httpOptions: { timeout: 20000, retryOptions: { attempts: 1 } },
    },
  });
  console.info(
    JSON.stringify({ model, connected: true, hasOutput: !!result.text }),
  );
} catch (error) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const status = typeof error?.status === "number" ? error.status : null;
  const category =
    status === 408 ||
    status === 504 ||
    /deadline|timed? ?out|timeout/.test(message)
      ? "provider_timeout"
      : message.includes("leaked")
        ? "key_reported_leaked"
        : message.includes("api_key_invalid") ||
            message.includes("api key not valid")
          ? "invalid_api_key"
          : (status === 401 || status === 403) && message.includes("expired")
            ? "expired_credentials"
            : message.includes("quota") ||
                message.includes("resource_exhausted")
              ? "quota_exhausted_or_unavailable"
              : message.includes("not found") || message.includes("not_found")
                ? "model_or_endpoint_unavailable"
                : message.includes("permission") || message.includes("blocked")
                  ? "permission_or_key_restriction"
                  : "provider_request_failed";
  // These descriptors are derived from fixed checks; raw messages never leave memory.
  const quotaLimitZero = /limit[:\s]+0\b/.test(message);
  console.info(
    JSON.stringify({
      model,
      connected: false,
      status,
      category,
      ...(category === "quota_exhausted_or_unavailable"
        ? { quotaLimitZero }
        : {}),
    }),
  );
  process.exitCode = 1;
}
