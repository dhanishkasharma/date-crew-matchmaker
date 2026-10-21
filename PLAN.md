# TDC Matchmaker Dashboard — MVP implementation plan

Status: the MVP and AI enhancements are implemented in C:\Users\saara\Matchmaker and hosted on Vercel/Render. Approved stack: MERN + TypeScript + Gemini free-tier API, with provider-neutral AI labels in the UI. Login, full profiles, preferences, matching, notes, mock introductions, AI shortlist review and natural-language preference previews are implemented. On 21 October 2026 the updated Render API and model configuration were deployed; all three hosted AI actions, login/session refresh, assignment isolation and Atlas connectivity were verified. See docs/DEPLOYMENT.md for live URLs and release evidence, README.md for checks, and docs/SETUP.md for configuration.

## Approved stack decisions

- React + Vite frontend; Node.js + Express API; MongoDB + Mongoose persistence.
- Gemini generates structured introductions on demand; use an eligible model with available free-tier quota.
- Atlas is the hosted database. Development can run a genuine local MongoDB process with disk persistence while Atlas credentials are pending.
- Username/password auth uses bcrypt hashes, opaque server sessions in MongoDB, and assignment checks on every protected API route.
- The application is built locally first, then deployed to a Node-compatible host. The earlier Sites experiment is not used for this MERN build.
- See docs/SETUP.md for Atlas, Gemini, environment variables, and demo credentials.

## 1. What this submission should demonstrate

Build a small, polished internal workspace in which a matchmaker can understand a customer, identify suitable candidates, explain the recommendation, and send a thoughtful introduction in a few minutes.

The submission should make four qualities easy to assess:

1. **Product judgment:** a complete customer workflow, useful defaults, realistic data, and clear empty/error states.
2. **Algorithm judgment:** explicit eligibility rules, mutual preferences, transparent scores, and honest handling of missing information.
3. **Useful AI:** a real API-backed introduction writer grounded in profile facts, with visible human review and a reliable fallback.
4. **Engineering judgment:** clean, readable, modular code, appropriate tests, persistent data, and a simple deployment. Avoid overengineering.

Prioritize a convincing end-to-end demo over a large feature list. Selection cannot be guaranteed; the aim is to provide strong evidence against every stated evaluation criterion.

## 2. Research and product implications

These are observations from public product documentation, followed by our own design decisions. They do not establish how competitors' private ranking algorithms work.

| Product / source                                                                                                    | Observation                                                                                                                                                          | Decision for this MVP                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Shaadi.com](https://www.shaadi.com/)                                                                               | The public experience emphasizes verified profiles, personalized matchmaking, and search by factors including location, religion, marital status, and mother tongue. | Make verification visible, organize biodata clearly, and capture explicit partner preferences. Verification is a seeded demo state, not an identity-verification implementation. |
| [Hinge preferences](https://help.hinge.co/hc/en-us/articles/360011063294-How-do-I-change-my-Preferences)            | Preferences can be marked flexible; family plans, children, intentions, and lifestyle appear among its preference categories.                                        | Separate dealbreakers from preferences and include family plans and marriage timeline. Never silently relax a dealbreaker.                                                       |
| [Bumble filters](https://support.bumble.com/hc/en-us/articles/28423691289629-Using-filters-to-set-your-preferences) | Filters include verification, languages, and interests. Its documentation explains that additional filters reduce the available pool.                                | Show the eligible-pool count and meaningful exclusion reasons so a matchmaker understands an empty shortlist.                                                                    |

**Synthesis:** combine the structured biodata expected in Indian matrimonial workflows with explicit life goals, lifestyle preferences, and a matchmaker's ability to explain a suggestion. The additional fields below are product proposals informed by this research, not claims that every competitor collects them.

## 3. Scope and priorities

### P0 — required for submission

- Username/password login, logout, protected pages, and assignment-based customer access.
- Customer table with name, calculated age, city, marital status, journey status, and verification state.
- Search and filters for city, journey status, and verification; clicking a row opens the customer's workspace.
- Full biodata containing every field in the exercise.
- Editable partner preferences, customer journey status, and timestamped meeting/call notes.
- At least **100 women and 100 men** in the separate candidate pool, so either customer gender has 100 opposite-gender candidates before eligibility filtering.
- Gender-specific eligibility and explainable, reciprocal compatibility ranking.
- Suggested-match cards, candidate biodata, score breakdown, and discussion points.
- A real AI-generated, editable introduction for a selected candidate.
- Send Match preview and mock delivery, including basic candidate information, a persisted event, and duplicate protection.
- Hosted demo, repository, documented credentials, setup instructions, and the requested 2–3 paragraph algorithm write-up.

### P1 — small differentiators, after P0 works

- A compact “Why these matches?” panel: pool size, eligible count, and exclusions grouped by rule.
- A clear distinction between compatibility and evidence coverage; incomplete profiles must not look certain.
- A useful next discussion prompt, such as “Confirm whether relocation to Pune is realistic.”
- A short demo recording and one-page architecture explanation for evaluators.

### Defer

Customer onboarding CRUD, billing, chat, real email delivery, identity-document verification, horoscope calculation, scheduling, embeddings/vector databases, trained recommendation models, microservices, background queues, and an admin permission framework. These do not improve the core assessment enough to justify their cost.

## 4. UX and main screens

### Login

Use a restrained TDC identity, a short explanation of the tool, labeled username/password inputs, show-password control, pending state, and generic invalid-credentials feedback. Publish a demo account in the README and login helper. Disable public signup.

### Customer dashboard

- Desktop-first internal-tool layout with warm neutral surfaces, a restrained plum or terracotta accent, clear typography, and generous spacing.
- Compact counts for assigned customers, profiles awaiting verification, and customers awaiting a shortlist. Every count comes from data.
- Searchable customer table with required columns, clear status labels, last interaction, and accessible row navigation.
- Initials avatars are sufficient. Avoid spending implementation time sourcing fictional portraits.
- Journey stages: Onboarding → Profile verified → Shortlisting → Introductions → Meeting → Paused / Closed. Verification remains a separate attribute; changing a journey stage never grants verification.

### Customer workspace

Use a persistent customer brief and three focused areas: Profile, Matches, and Notes & Activity. Keep life-plan criteria above the shortlist; use comparable candidate cards on wide screens and stack the content on narrow screens.

- Group biodata into personal/contact, education/career, family/cultural background, lifestyle, and partner preferences.
- Display unavailable values as “Not provided”; retain explicit Yes / No / Maybe choices.
- Show candidate cards with name, age, city, profession, verification, compatibility index, two factual fit reasons, one discussion point when relevant, and Send Match.
- Open a candidate's complete biodata from their card without losing the customer's context.
- Keep notes quick: note type, text, author, and timestamp; show a save result and retain unsaved text on failure.
- Provide loading, no-results, no-eligible-matches, expired-session, save-failed, and AI-unavailable states.
- Support keyboard navigation, visible focus, labeled controls, modal focus management, and status indicators that do not depend only on color.

### Send Match

Send Match opens an email preview addressed to the customer. Include candidate name, age, city, profession, and a short introduction. Offer “Generate AI introduction,” allow editing, and require a final “Send mock email” action. Display “Mock email recorded — no email was delivered” after persistence succeeds.

Keep a per-candidate “Sent” state and activity entry. Store a unique customer/candidate send record so retries or double clicks cannot create duplicate sends. Returning to the customer should preserve the sent state.

## 5. Data and fictional profiles

### Required biodata

First name, last name, gender, date of birth, country, city, height, email, phone, undergraduate college, degree, income, current company, designation, marital status, languages, siblings, caste, religion, want kids, open to relocate, and open to pets.

Store date of birth and derive age; use centimeters for height and annual INR for the seeded income values. Keep income currency and annual period explicit. Unknown income is null, never zero.

### Additional fields worth including

| Area                         | Proposed fields                                                                                      | Purpose                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Communication and background | Mother tongue, short self-description, interests                                                     | Practical communication and introduction context                                 |
| Lifestyle                    | Diet, smoking, drinking, work schedule                                                               | Identify everyday compatibility and explicit dealbreakers                        |
| Family plans                 | Existing children, marriage timeline, preferred family living arrangement                            | Distinguish wanting children from already having children; surface expectations  |
| Career and location          | Career priorities, support for a partner's career, preferred cities, relocation destinations         | Assess practical compatibility without assuming identical professions are better |
| Values                       | Self-selected values such as independence, family involvement, ambition, and shared responsibilities | Use declared priorities rather than inferred stereotypes                         |
| Preferences                  | Accepted age range, marital statuses, life-goal preferences, and strict/flexible settings            | Make assumptions inspectable and enforce mutual dealbreakers                     |
| Operations                   | Verification state/date, active/paused state, assigned matchmaker, profile update timestamp          | Keep the working shortlist trustworthy and reproducible                          |

Caste and religion remain optional biodata. Do not award default compatibility points for either or infer them from a name. If a customer explicitly declares a related preference, represent it transparently in the preference model. Do not rank skin tone, attractiveness, family wealth, or college prestige. Horoscope details can be a future opt-in field; no invented astrological compatibility.

### Seed strategy

- Seed approximately 12 assigned customers across both genders and journey stages, plus a separate pool of 200 candidates: 100 women and 100 men.
- Use a deterministic seed so the same dataset can be recreated and discussed during review.
- Include realistic combinations of age, education, career stage, city, and income; diversify lifestyles and backgrounds without linking traits through stereotypes.
- Include deliberate scenarios: strong match, incompatible children plans, blocked relocation, unverified profile, equal-income/height boundaries, missing data, and no eligible candidates.
- Ensure demo customers have useful eligible shortlists while preserving intentionally difficult cases.
- All profiles are fictional adults, with an explicit demo label. Use reserved example email domains and masked, non-contactable phone placeholders.
- Add seed validation for profile counts, dates, required fields, allowed enums, duplicate IDs, and sane units.

## 6. Custom matching algorithm

Implement the algorithm as pure TypeScript functions independent of React, the database, and the AI provider. Keep policy constants in one configuration file. Return structured results: eligibility, exclusion reason codes, directional scores, final score, coverage, factual reasons, and unresolved questions.

### Step A — eligibility before ranking

For all customers:

1. Exclude self, inactive, paused, unavailable, and unverified candidates.
2. Restrict to the opposite-gender pool as required by this exercise. Document this as MVP scope; keep gender and partner preference separate in the schema for later expansion.
3. Enforce explicit dealbreakers in both directions, including accepted marital statuses, age ranges, children plans, and location constraints where marked strict.
4. A definite Yes/No conflict on wanting children is incompatible. Maybe means unresolved, not an automatic Yes. Missing information required by a hard rule makes the candidate ineligible pending clarification.

For a **male customer**, additionally enforce the exercise's exact policy:

- Candidate is a woman born after the customer: younger by date of birth.
- Candidate's annual income is strictly lower, using comparable currency/period values.
- Candidate's height is strictly lower.
- Candidate's want-kids value exactly equals the customer's known value, including Maybe/Maybe. Maybe/Maybe must still carry a discussion flag.

These are named **assessment policy rules**, visible in the UI and documented as brief requirements rather than claims about what all men prefer. Missing age, height, income, or children information cannot pass these checks. Equality fails the younger/lower/shorter conditions.

For a **female customer**, do not add unrequested male-income, age, or height assumptions. Apply her declared preferences, the candidate's declared dealbreakers, and the compatibility model below. A male candidate's explicitly saved preferences still apply, but the male-customer assessment policy is not automatically injected as his personal preferences.

### Step B — score eligible candidates

Use the same understandable component model for both genders; the gender-specific distinction comes from the eligibility policy and each person's declared preferences.

| Component                   | Initial weight | What it measures                                                                     |
| --------------------------- | -------------- | ------------------------------------------------------------------------------------ |
| Life plans                  | 30%            | Children intentions and marriage timeline                                            |
| Values and lifestyle        | 25%            | Declared values, diet, smoking/drinking preferences, family living expectations      |
| Location and relocation     | 20%            | Current city, accepted future cities, and a feasible shared location                 |
| Career and work style       | 15%            | Career support, compatible schedules, and priorities; no profession prestige ranking |
| Communication and interests | 10%            | Shared languages and interests                                                       |

Define small, documented scoring tables before implementation: aligned = 1, explicitly acceptable/partial = 0.5, incompatible = 0. Unknown = 0.5 with zero evidence coverage. Within a component, average its documented subcriteria; distinguish “no preference” from missing data. For example, “any diet is fine” is known flexibility, not an unknown answer.

Relocation must be practical: matching Yes flags alone is insufficient. Look for a common accepted city; Maybe or unknown destinations require discussion. A firm conflict marked as a dealbreaker is filtered earlier.

Calculate preference fit in each direction:

```text
S(A → B) = 100 × sum(component weight × directional component fit)

mutual score = harmonic mean(S(A → B), S(B → A))
             = 2ab / (a + b), or 0 when a + b = 0
```

The harmonic mean reduces a score when only one person's preferences fit well. Example: directional scores of 90 and 60 produce a mutual score of 72. Keep weights fixed rather than redistributing unknown fields into stronger-looking scores. Calculate evidence coverage as the weighted fraction of known subcriteria, using the lower directional coverage for the displayed pair.

Sort by mutual score, then coverage, then stable profile ID. Always show the breakdown. Initial display bands: **High potential** at 80+ with at least 80% coverage and no unresolved children/location question; **Worth exploring** at 65+ with at least 60% coverage; otherwise **Needs discussion**. These are heuristic compatibility indices, never predicted relationship-success probabilities.

### Step C — explain the result

- Generate factual match reasons from scored fields: “Both want children,” “Both accept living in Bengaluru,” or “Shared Hindi and English.”
- Show tradeoffs separately: “Different marriage timelines; confirm flexibility.”
- Show which firm rules passed without presenting demographic comparisons as romantic virtues.
- If there are no candidates, show exclusion counts and allow the matchmaker to edit genuinely flexible preferences. Never weaken the assessment policy or a saved dealbreaker automatically.
- Include the policy version with persisted send records so an introduction can be traced back to the criteria used.

### Validation before tuning

Create 12–15 deliberately constructed pairs with independently written expected eligibility, ordering, and reasons. Include both customer genders and one-sided preference fits. Use them to review the initial weights. Random fictional profiles cannot establish real-world matchmaking accuracy; leave outcome-based calibration for actual consented feedback later.

## 7. AI integration that adds value

**Primary AI feature:** generate a short, personalized introduction for a selected eligible match. This directly meets the brief's AI-introduction option. Deterministic ranking and match reasons work independently of the AI service.

Use a server-only Gemini call with a configurable model that supports structured output. Request a small response such as `subject`, `introduction`, and `discussionQuestion`. Gemini documents JSON-schema-constrained responses and refusal handling in its [Structured Outputs guide](https://ai.google.dev/gemini-api/docs/structured-output). Schema conformance does not prove factual accuracy; validate and review the content too.

- Send only selected profile facts, compatibility evidence, and relevant unresolved questions. Omit phone, email, exact DOB, private notes, caste, religion, and income from the generation payload.
- Ask for a warm, professional introduction of roughly 60–90 words. No invented personality traits, guarantees, or unsupported reasons.
- Treat profile text as data and explicitly disregard instructions embedded inside it.
- Validate response shape and length, handle refusals/incomplete output, and let the matchmaker edit before mock sending.
- Generate on demand; do not call the LLM for every candidate or every page load. Set a timeout, output limit, per-user request allowance, and deployment spend limit.
- Use a deterministic template if the key is absent or the request fails. Label it “Template introduction”; label successful live generation “AI-generated draft.” Never represent fallback text as live AI.
- Persist the final reviewed email text in the send event. The MVP does not need a generation-cache service.

Acceptance: demonstrate at least one successful live generation before submission and record a short demo clip. A fallback-only deployment is functional but does not demonstrate the chosen mandatory AI feature.

## 8. Simple technical architecture

| Layer      | Choice                                                  | Reason                                                                     |
| ---------- | ------------------------------------------------------- | -------------------------------------------------------------------------- |
| Frontend   | React + Vite + TypeScript                               | Familiar MERN frontend with a small component structure                    |
| UI         | Custom CSS design tokens, accessible HTML, Lucide icons | A cohesive visual system without a large framework                         |
| Backend    | Node.js + Express + TypeScript                          | Explicit API routes, validation, authorization, and Gemini integration     |
| Data       | MongoDB + Mongoose                                      | Profiles embed bounded preferences; operational records reference profiles |
| Auth       | bcrypt + MongoDB-backed opaque sessions                 | Password hashes, HttpOnly cookies, persistent sessions                     |
| Validation | Zod                                                     | Shared profile types and runtime input validation                          |
| Tests      | Vitest + Supertest + Playwright                         | Pure matching tests, real MongoDB API tests, and browser flows             |
| Hosting    | Node-compatible host + MongoDB Atlas                    | Express serves the React production bundle from one origin                 |

Project structure:

```text
client/          # React views, components, styles, API client
server/          # Express app, models, Mongo connection, seed, Gemini
shared/          # Domain schemas/types, deterministic seed, pure matching
tests/           # Algorithm and API integration tests
tests/e2e/       # Critical browser workflows
docs/            # Setup, research, algorithm, architecture
```

Collections: users, profiles, customers, notes, sends, and sessions. Profiles contain bounded preference/lifestyle objects. Customers reference a profile and assigned owner. A unique customer/candidate index prevents duplicate mock sends. Database queries enforce ownership; shared candidates are read-only. Never expose MongoDB credentials or the Gemini key in the browser.

Use bcrypt password hashes; regenerate sessions on login; use HttpOnly, SameSite cookies with Secure in production; rate-limit login and AI; validate same-origin writes and every request body. No public signup or password recovery is needed for this assessment.

The runtime flow: authenticate → load assigned customers and shared candidates → compute matches → render → re-check ownership and current eligibility on mutations. Use one Express API and one React app. No generic repositories, service framework, queues, or vector database.

## 9. Clean code and proper practices — without overengineering

- TypeScript strict mode; meaningful names; explicit domain types for profiles, preferences, scores, and journey stages. Avoid `any` and unexplained numeric constants.
- Small, cohesive functions with one purpose. Keep UI rendering, matching rules, persistence, and AI calls separate.
- One source of truth for policy weights, eligibility rules, and runtime schemas. Reuse derived types where practical.
- Comment the reason for unusual rules and tradeoffs, particularly the assessment-specific policy. Do not narrate obvious code.
- Validate server inputs, re-check customer ownership, and return useful errors. Never log credentials, private notes, or full profile payloads.
- Use framework state and URL query parameters for ordinary interactions. Introduce no global-state library until an actual cross-screen requirement appears.
- Extract a shared component when repetition or a real responsibility justifies it. Avoid generic repositories, abstract base services, dependency-injection containers, plugin engines, and speculative hooks.
- Pin dependencies with a lockfile; provide `.env.example`; ignore secrets; add reproducible seed/setup commands and focused commits.
- Run formatting, lint, type checking, meaningful tests, and a production build. A minimal CI workflow should run the same checks.
- Document decisions and limitations in short prose that the candidate can explain in a code review.

## 10. Implementation sequence and checkpoints

Target approximately **18–24 focused hours**, adjusted to the actual exercise deadline and account readiness. Complete each working slice before adding optional polish.

| Phase                            | Approximate effort | Exit condition                                                                               |
| -------------------------------- | ------------------ | -------------------------------------------------------------------------------------------- |
| 1. Research and scope            | 1 hour             | Sources, fields, policy assumptions, and screen outline agreed in docs                       |
| 2. Foundation and early deploy   | 2–3 hours          | App builds; hosted login works; schema and deterministic seed load                           |
| 3. Customer workflow             | 3–4 hours          | Assigned dashboard, full biodata, persistent notes/status, and access controls work          |
| 4. Matching engine and shortlist | 4–5 hours          | Both gender paths, mutual scores, exclusions, and independently expected scenarios pass      |
| 5. AI and mock send              | 2–3 hours          | Live AI draft, editable preview, template fallback, persisted send, duplicate protection     |
| 6. UX and verification           | 3–4 hours          | Error/empty states, responsive layouts, accessibility review, core browser tests             |
| 7. Submission                    | 2 hours            | Live demo smoke-tested; repository, credentials, write-up, screenshots, and demo guide ready |

External setup: MongoDB Atlas free cluster, Gemini API key with available free-tier quota, and later GitHub/Node-host access. Local MongoDB supports development before Atlas is configured. Keep secrets in local/hosting environment settings. Discover missing account access early; never replace a missing live deliverable with a fabricated link.

If time is tight, remove P1 enhancements, optional counters, and the recording before reducing matching correctness, real AI demonstration, required biodata, notes, mock-send persistence, or hosted-demo verification.

## 11. Verification and acceptance checklist

### Matching and data

- [ ] 100 male and 100 female candidate profiles exist independently of assigned customers.
- [ ] Unverified, inactive, unavailable, and self profiles are excluded.
- [ ] Male-policy tests cover age/DOB boundaries, equal income, equal height, non-comparable income, missing fields, and all children choices.
- [ ] Female-customer results respect her preferences and candidate dealbreakers without implicit salary/status assumptions.
- [ ] Relocation considers actual feasible cities; Maybe and missing answers produce appropriate discussion flags.
- [ ] Strong one-sided compatibility is reduced by reciprocal scoring; scores are bounded and sorting is deterministic.
- [ ] Displayed reasons correspond to actual fields; score, evidence coverage, and success probability are not confused.
- [ ] Changing preferences recalculates results; a send re-checks current eligibility on the server.

### Product and authorization

- [ ] Login succeeds/fails clearly; refresh preserves the session; logout protects subsequent navigation.
- [ ] Dashboard shows only assigned customers; direct URL and mutation attempts against another owner's customer fail.
- [ ] Required biodata, search/filter behavior, and full candidate details are visible.
- [ ] Notes and status changes survive refresh; a failed save does not falsely report success.
- [ ] AI generation succeeds live; timeout/refusal/missing-key cases visibly use the template path.
- [ ] Send preview includes candidate information; mock send persists once; double clicks and retries stay idempotent.
- [ ] Keyboard access, dialogs, mobile/tablet layout, and empty/error states receive a manual review.

### Release

- [ ] Lint, type checking, matching tests, critical end-to-end flows, and production build pass.
- [ ] Fresh setup and seed instructions work from the repository; no credentials appear in source control or browser bundles.
- [ ] Hosted credentials, auth redirects, persistence, AI, and mock sending work in a fresh browser session.
- [ ] All supplied links open for the evaluator. Record known limitations honestly.

Use targeted tests for algorithm boundaries, authorization, and the core journey. Avoid snapshot-heavy tests, testing UI-library internals, or pursuing coverage percentages without meaningful scenarios.

## 12. Submission package and evaluator walkthrough

Provide:

1. **Live application URL** and **GitHub repository URL**, verified after deployment.
2. **Sample username/password**, with clearly labeled fictional data and mock email behavior.
3. **README:** product overview, screenshots, local setup, environment variable names, seed command, test commands, and deployment instructions.
4. **`docs/algorithm.md`:** the requested 2–3 paragraphs, followed separately by optional technical scoring details.
5. **`docs/research.md`:** sources and resulting product decisions.
6. **`docs/architecture.md`:** why this stack, the data flow, meaningful tests, and deliberate scope tradeoffs.
7. **A short walkthrough:** login → find a customer → inspect biodata → explain one accepted and one excluded match → switch customer gender → add a note → generate an introduction → mock send → refresh to prove persistence.

Be ready to explain why the core score is deterministic, why mutual preferences matter, how missing data affects confidence, how AI failure is handled, why the app has one deployable codebase, and what would change with real production data.

### Draft of the required 3-paragraph write-up

The following is intended submission language **after implementation and validation**. Update it to match what actually ships.

**AI integration.** The dashboard uses a server-side Gemini integration to draft a personalized introduction for a selected eligible match. The model receives a limited set of profile facts and computed compatibility evidence, then returns a structured draft that the matchmaker can edit before mock sending. It does not decide eligibility or invent a score. If generation is unavailable, the dashboard clearly labels and uses a template introduction so the workflow remains usable.

**Algorithm design.** Matching first applies verification, availability, mutual dealbreakers, and the exercise's male-customer requirements: a younger, shorter woman with lower income and the same stated children preference. Female-customer matching uses declared preferences and compatibility across life plans, values, location, career priorities, and communication. Eligible pairs receive weighted preference-fit scores in both directions, combined using a harmonic mean so a strong one-sided fit cannot dominate. Each recommendation shows factual reasons, unresolved questions, and evidence coverage.

**Assumptions.** All records are fictional adults, verification is simulated, and the exercise uses an opposite-gender candidate pool. The male-specific restrictions implement the brief rather than universal preferences; the remaining preferences are explicit and configurable. Income is compared only in equivalent annual currency units, missing hard-rule data cannot pass eligibility, and uncertain answers require discussion. Initial weights and labels are heuristics, not calibrated probabilities of relationship success; real-world tuning would require consented outcome feedback and review for unintended bias.

## 13. Definition of done

An evaluator can open the hosted link, sign in using the supplied credentials, inspect an assigned customer's complete profile, understand the shortlist and its tradeoffs, save a note, generate a real AI introduction, and record a mock send. Refreshing preserves the operational changes. The repository explains the architecture and matching policy clearly enough to discuss every consequential decision.

## 14. Post-MVP assessment review — 20 October 2026

Status: branding, Send Match, provider-neutral AI labels, shortlist review and natural-language preference preview/apply are implemented. Authored profile narratives, safe explicit legacy-text migration, validation/fallback tests and five isolated browser scenarios are also implemented. The new model default is gemini-3.5-flash-lite after successful live evaluation; the previously configured model returned provider timeouts. The optional persisted match-decision feature is deferred. Hosted rollout and release evidence are tracked in docs/DEPLOYMENT.md; the sections below retain the implementation requirements. The original acceptance checkboxes above must be reconciled with actual evidence before submission; an unchecked box is not by itself proof that a feature is absent.

### What already meets the brief

Login and ownership isolation, assigned customer lists, all requested biodata fields, journey updates, persistent notes, 100 candidates of each gender, male-specific eligibility, female preference compatibility, transparent reciprocal scores, editable Gemini introductions, persisted mock sends, public hosting, and an algorithm write-up are implemented. Existing fit reasons and scores are deterministic; they must not be described as AI-generated. Gemini is the actual provider, not OpenAI. The brief permits LLM use and does not require switching providers.

The next iteration should demonstrate three distinct AI uses within the same workflow: shortlist ranking with explanations, natural-language reasoning about profile fit/preferences, and the existing email drafting. Additional AI calls should produce a useful decision aid, not merely repeat the score in different words.

### A. Close concrete completeness gaps first

- Correct the visible brand from "The Dating Company" to "The Date Crew" and check page metadata and repository copy for the same mismatch.
- Expose a literal "Send Match" action on every eligible suggestion, opening the existing review/draft dialog. Preserve the explicit final "Send mock email" step and duplicate protection. Update browser selectors and walkthrough copy with the new label.
- Keep the selected ivory/plum visual direction. Add new capabilities through the existing shortlist toolbar, candidate review panel, and preference editor; avoid another dashboard redesign or a generic chatbot page.
- Improve fictional data deliberately: varied bios and career-priority statements consistent with structured fields, realistic tradeoffs, and clearly identified demonstration cases. The current shared bio cannot support meaningful semantic comparisons. Do not infer values from names, religion, caste, income, college, or profession.
- Introduce fixtures covering a strong mutual fit, a strong one-sided fit, unresolved relocation, a children conflict, missing information, and a failed male-policy boundary. Keep bulk seed generation reproducible and add a few authored cases rather than a complicated synthetic-data system.
- Apply any seed revision through an explicit, idempotent migration of known demo records. Never reset Atlas or erase existing notes/sends on startup. Document which demo records change.

Exit: the required action is discoverable, branding matches the recipient, all required fields remain visible, and the walkthrough includes both a good fit and a meaningful exclusion/tradeoff.

### B. AI shortlist review — ranking plus grounded explanations

Add an on-demand "Review shortlist with Gemini" action. The server computes the eligible shortlist from current saved preferences, then sends only the first eight candidates and a minimal customer context in one bounded request. Review fewer when fewer are eligible; an empty pool does not call the model. Clearly label this as a review of eight candidates, not the entire pool.

- Gemini returns a review order, a concise comparison summary, candidate-specific strengths, unresolved issues, and one useful discussion question. Each claimed strength/issue references server-issued evidence IDs from the supplied profile facts and matching report.
- Return each reviewed candidate exactly once. Validate the allowed candidate IDs, evidence ownership, unique ordering, required fields, length bounds, and known unresolved conflicts. Reject invalid output rather than showing a partial or invented ranking.
- Display the optional AI review order separately from the deterministic mutual-fit score and evidence coverage. Preserve a direct switch back to the default order. No invented success percentages or arbitrary blend of an LLM score with the existing index.
- Preserve all server exclusion rules and uncertainty flags. Gemini cannot admit an excluded candidate, relax the assessment policy, erase a known conflict, or send a match. A useful recommendation can say "Discuss relocation first" despite a high numeric fit.
- Give each review item a concise evidence panel: what both people stated, what is unresolved, and why the model suggests reviewing it in that position. Render referenced facts from canonical server data. Generated prose remains labeled AI interpretation; valid JSON and valid references alone do not prove every sentence is correct.
- Allowlisted inputs include relevant declared values/interests, work schedule, career priorities, life plans, location options, and a bounded public bio after checking for contact details. Exclude contact fields, exact DOB, income, caste, religion, family wealth, and private notes. Include age-policy outcomes as already-computed facts if needed, without sending financial details.
- A timeout, quota failure, missing key, or invalid response preserves the deterministic shortlist with an honest notice. Never present fallback copy as Gemini output.

Exit: a real model request can compare eligible candidates, explain an order with inspectable facts, and identify a tradeoff; invalid IDs or unsupported evidence cannot enter the displayed review. A live failure leaves the current shortlist usable.

### C. Natural-language preference assistant — interpret, preview, apply

Extend the existing preference editor with a small "Describe preferences" input. Example: "Prefer ages 28–34, Bengaluru or Pune; non-smoking is a must." Gemini converts this into a bounded proposal using fields already supported by the preference schema.

- Return a partial patch, references to the relevant input phrases, and unresolved/unsupported requests. Do not replace the full preference object or silently fill unspecified fields.
- Show the exact before/after changes, distinguish firm requirements from flexible preferences, and compute the eligible-pool count before and after using the same pure matching engine. Mark results as a preview until saved.
- Require an explicit "Apply preferences" action. Revalidate ownership, the current saved preferences, the proposal, and eligibility on the server. A stale preview must be refreshed rather than overwrite newer edits.
- Ambiguous language should produce a question or an incomplete proposal, not a guess. Unsupported requests such as changing the assessment's male policy or filtering on inferred personality must be flagged without executing them.
- Do not mine private meeting notes, alter profile biodata, or treat "flexible" as permission to remove an unrelated saved dealbreaker. Keep manual editing available if the provider is unavailable; do not fake successful parsing with an unlabeled keyword fallback.

This feature supplies the third requested AI dimension through natural-language rule interpretation; the shortlist review supplies natural-language reasoning about pair fit as well. Neither feature creates an autonomous rule engine.

Exit: the example yields an inspectable, correct patch and a pool-size preview; nothing persists before Apply; ambiguous or hostile text cannot change protected policy or trigger sends.

### D. Make AI quality reviewable

- Create a small authored evaluation set, approximately 12–16 cases, with independently specified expected behavior. Include clear compatibility, contradictory life plans, bilateral preferences, partial information, ambiguous language, unsupported attributes, prompt injection in profile text, and attempts to override hard eligibility.
- Mock provider boundaries in CI to test malformed output, unknown/duplicate candidate IDs, invalid evidence references, stale reviews/previews, quota errors, and timeouts. These tests verify application behavior, not real model quality.
- Run an explicit, opt-in live evaluation against the same fixtures using the configured key. Record model/prompt version, date, counts, validation failures, latency, and a human review of factual support and useful tradeoffs. Report actual results; synthetic cases are not evidence of relationship success or production recommendation accuracy.
- Reuse reviews only when their owner/customer scope and hash of the exact model input, policy version, prompt version, and model match. Deduplicate simultaneous identical requests. A small bounded in-process cache is enough initially; no Redis, queues, or external cache service. Preference or profile changes invalidate a displayed review.
- Share one server-side Gemini request/validation helper where the three actual use cases repeat code. Keep separate schemas/prompts and focused modules for introductions, shortlist review, and preference proposals. No orchestration framework, vector database, embeddings, or autonomous agents.
- Apply one shared per-user AI budget to all new endpoints, bound input/output sizes and execution time, and provide visible retry behavior. Log safe operational metadata only. Make no promise about free-tier capacity; verify available quota before the final demonstration.

Exit: the submission includes repeatable behavioral checks, an honest live-evaluation summary, and a clear account of what AI can and cannot change.

### E. One small operational differentiator, if the release gates are green

Add a persisted matchmaker decision per customer/candidate: Shortlisted, Hold, or Declined, with an optional short reason and timestamp. Support editing/clearing it, display it in activity, and keep it distinct from the existing sent state. This makes the tool useful between recommendation and introduction. Do not automatically train or alter global weights from a few fictional decisions.

This follows the two requested AI additions and is the first feature to drop if it risks the exercise deadline. Do not add scheduling, real emails, chat, billing, full customer CRUD, or an admin system for this iteration.

### F. Release and submission evidence

- Run the existing checks plus targeted tests for the new rules, schemas, ownership checks, stale state, and fallbacks. Run and fix the supplied Playwright suite against isolated demo data; it was previously supplied but not executed automatically. Expand it to cover Send Match, persisted mock delivery, the preference preview/apply boundary, and visible AI fallback states with controlled provider responses.
- Test keyboard operation, long content, dialogs, empty/no-eligible results, and narrow screens for each added panel. Keep controls visible and use plain language rather than adding decorative AI icons.
- Reconcile the acceptance checklist from current evidence, update the required 2–3 paragraph algorithm write-up to describe only shipped behavior, and retain research links with a short explanation of resulting product choices.
- Deploy the finished release to Render/Vercel and verify both demo accounts, direct-route refresh, saved notes/preferences/decisions, one mock send, and each live AI action. Preserve the previous working release as the rollback reference.
- Prepare a 3–5 minute recording and a short evaluator guide: female customer -> fit versus tradeoff -> AI shortlist review -> natural-language preference preview -> male-policy example -> Gemini introduction -> mock send -> refresh -> second account isolation. Keep steps concise enough for the stated recording length.
- Prepare the submission email with the live URL, repository URL, demo credentials, required write-up, and resume/portfolio. Use subject "Full Stack Developer Internship – Dhanishka Sharma – Assignment" after confirming the resume's preferred name. Draft only; sending email requires an explicit instruction from the user. Never fabricate a portfolio or attach an assumed resume.

### Delivery sequence and scope guard

1. Completeness fixes and authored demo/evaluation cases.
2. AI shortlist review, with evidence validation and fallback, delivered as one working slice.
3. Natural-language preference preview/apply, with tests, delivered as one working slice.
4. Optional persisted match decisions only if the required slices and verification pass.
5. Automated browser checks, actual live evaluation, hosted verification, and submission package.

Keep the same MERN deployment and a small number of cohesive modules. No framework migration or infrastructure expansion is required. Work within the original two-day deadline; its receipt time is not established by this review. The goal is demonstrable correctness, useful AI, and decisions the candidate can explain in an interview. Interview selection cannot be guaranteed.

Technical reference rechecked on 20 October 2026: [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output). The provider documents JSON Schema support and explicitly requires application validation and handling of semantically incorrect output. [Hinge's preference guidance](https://help.hinge.co/hc/en-us/articles/360011063294-How-do-I-change-my-Preferences) distinguishes flexible preferences; this supports our explicit preview of firm versus flexible criteria, rather than silently broadening the pool.
