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
- Compatibility rules and missing-data handling are deterministic. AI can suggest a separate review order, propose supported preference changes and draft text. It cannot change eligibility or send a match. Structured format and valid evidence references are not factual proof of the generated prose.

## AI boundaries

`server/ai.ts` owns the provider call, structured parsing, safe diagnostics and bounded execution. Separate modules own introduction drafting, shortlist review and preference proposals; `shared/ai.ts` defines their response contracts. The frontend uses provider-neutral "AI" labels. No new provider, agent framework or external infrastructure is needed.

Bootstrap advertises `aiAssistanceAvailable` for the new review/proposal routes. Until the updated API is deployed, the frontend preserves the existing workflow and hides unsupported new controls. This optional capability field keeps independent Vercel/Render deployments compatible; it is not an external feature-flag service.

Shortlist review takes the server's top eight eligible candidates. It validates exact membership, unique ordering and evidence references scoped to the relevant pair. Returned facts and unresolved concerns come from canonical data, not model-written copies. A bounded process-local cache shares identical in-flight/successful reviews for ten minutes; its key includes owner/customer scope, exact input, model, prompt and matching-policy version. Context changes invalidate both the cache key and the displayed review.

The model selects evidence IDs and a review order; the server builds each candidate explanation from the selected facts' actual alignment/discussion states. Candidate-specific free-form rationale is deliberately absent from the provider schema. A visual QA pass caught an unsupported schedule comparison in an early free-form rationale; this narrower contract removes that failure mode from the displayed explanation. The overall summary and discussion questions remain model-generated and require review.

Preference interpretation takes only the typed request, saved preferences and allowed city names. It returns a strict partial patch with exact input quotes, questions and unsupported requests. Ready proposals live in a bounded process-local store for fifteen minutes. Apply accepts the opaque proposal ID, checks its owner/customer and profile/pool snapshot, and uses a database compare-and-swap against the original preferences. Client-supplied replacement values cannot alter the stored proposal. Restarts discard previews; the UI asks for a fresh one. Manual editing remains independent. Shared per-user AI rate limiting covers all three features; SDK automatic retries are disabled so provider overload does not turn a short UI request into minutes of waiting.

## Validation

Vitest covers matching boundaries and all three AI boundaries with mocked provider calls. Supertest exercises auth, ownership, persistence, stale/replayed proposals and sends against real ephemeral MongoDB. Playwright now runs five scenarios against its own ephemeral database and ports 4100/5174, without reading the real API key or writing to Atlas. Controlled AI responses exercise successful UI flows; the real endpoints exercise fallback and persistence. The opt-in live evaluation is separate and records actual provider results in docs/AI-EVALUATION.json.

External account configuration, live Gemini quota, and deployment remain separate checks. Never label fallback text as AI-generated or report a hosted URL before deployment succeeds.
