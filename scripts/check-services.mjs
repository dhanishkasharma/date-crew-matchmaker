import "dotenv/config";

// Check the app boundary, not raw credentials. No secrets or cookies are printed.
const base = `http://127.0.0.1:${process.env.PORT || 4000}/api`;
let cookie;
async function request(path, body) {
  const response = await fetch(`${base}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30000),
  });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  const data = await response.json();
  if (!response.ok)
    throw new Error(`App check failed with HTTP ${response.status}.`);
  return data;
}

try {
  await request("/health");
  await request("/auth/login", { username: "priya", password: "TdcDemo2026!" });
  const workspace = await request("/bootstrap");
  console.info(
    JSON.stringify({
      api: "connected",
      database:
        workspace.storage === "atlas"
          ? "configured MongoDB connected"
          : "local development MongoDB",
      customers: workspace.customers.length,
      candidates: workspace.candidates.length,
      geminiKeyConfigured: workspace.aiConfigured,
      model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
    }),
  );
  const report = await request("/customers/customer-1/matches");
  const candidate = report.matches[0]?.candidate;
  if (!candidate)
    throw new Error(
      "No eligible demo candidate is available for the AI check.",
    );
  const draft = await request("/customers/customer-1/introductions", {
    candidateId: candidate.id,
  });
  console.info(
    JSON.stringify({
      introductionSource: draft.source,
      liveGeminiVerified: draft.source === "gemini",
      ...(draft.notice ? { notice: draft.notice } : {}),
    }),
  );
  await request("/auth/logout", {});
  if (draft.source !== "gemini") process.exitCode = 1;
} catch (error) {
  console.error(
    error instanceof Error && error.message.startsWith("App check")
      ? error.message
      : "Service check did not complete. Confirm the app is running and review its safe startup output.",
  );
  process.exitCode = 1;
}
