# Architecture and tradeoffs

React/Vite renders the workspace; Express owns sessions, authorization, persistence, and Gemini calls. Shared TypeScript types and Zod schemas keep the request/response boundary explicit. The matching engine is pure and has no database, UI, or LLM dependency.

## Data model

- `users`: username, display name, role, bcrypt password hash.
- `profiles`: candidate/customer classification and validated biodata with bounded embedded preferences.
- `customers`: profile reference, assigned matchmaker, journey stage, update timestamps.
- `notes`: customer/owner reference, interaction type, author, text, timestamps.
- `sends`: unique customer/candidate pair, reviewed email content, draft source, compatibility index, policy version, timestamps.
- `sessions`: opaque server sessions, expiration managed by the MongoDB session store.

The authenticated bootstrap returns only assigned customers and their notes/sends. The candidate pool is shared and read-only. Every customer route independently verifies ownership. API responses exclude password hashes and secrets and use no-store caching. Inputs are bounded and validated; model verification fields cannot be changed through the UI.

Authentication uses an HttpOnly SameSite cookie, session regeneration at login, MongoDB persistence, bcrypt, and login rate limiting. Production adds Secure cookies, an explicit session secret, HTTPS, and the configured exact browser origin. Origin checks protect browser writes. The proxy setting assumes one trusted deployment proxy; adjust it for a different hosting topology.

## Deliberate limits

- One application process and a 200-person pool do not need Redis, queues, a vector database, or database-side ranking. API login/AI rate limits are process-local; a multi-instance deployment needs a shared limiter.
- The browser ranks the authorized read-only pool for responsive exploration. The API recomputes eligibility before draft generation and sending, so client-side edits cannot bypass policy.
- A native database uniqueness constraint prevents duplicate sends. There is no real email transport, signup, identity verification, or customer-import system.
- The development MongoDB launcher is genuine MongoDB with disk persistence; Atlas configuration is explicit for hosting. Development dependencies are not an operational hosted database strategy.
- Bootstrap is intentionally simple. A larger deployment would paginate/filter the pool at the API, avoid sending unnecessary contact data, and cache recommendations by profile/policy version.
- Compatibility rules and missing-data handling are deterministic. LLM output is text assistance, requiring review. Structured format is not factual proof.

## Validation

Vitest covers matching boundaries and the Gemini integration boundary with mocked provider calls. Supertest exercises auth, ownership, persistence, and sends against real ephemeral MongoDB, separate from app data. Playwright scenarios are supplied for repeatable browser checks. Browser QA also inspects the visual layout and full workflow.

External account configuration, live Gemini quota, and deployment remain separate checks. Never label fallback text as AI-generated or report a hosted URL before deployment succeeds.
