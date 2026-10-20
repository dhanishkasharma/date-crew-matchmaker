# AI assistance: evaluation and limits

The application uses three constrained tasks: shortlist review, preference interpretation, and editable introduction drafting. Eligibility and the mutual-fit index remain deterministic. No AI score is presented as a success probability.

## Repeatable checks

`npm test` exercises the provider boundary with controlled responses and uses a real isolated MongoDB for API integration. Cases cover unknown/duplicate candidates, foreign/duplicate evidence references, missing candidates, invalid JSON, provider errors, missing keys, cache isolation/invalidation, unsupported preference fields, invented quotes, invalid ranges/cities, ambiguous language, guessed ages, silent relaxation of a firm rule, preview expiry, owner isolation, stale/replayed Apply and safe legacy-text migration. These tests verify application behavior; they do not establish real model quality.

`npm run test:e2e` runs five browser scenarios using a separate temporary database and ports 4100/5174. Successful AI output is controlled at the UI boundary. Real endpoints verify fallback and persistence. Test data does not touch Atlas or spend live AI quota. CI includes Chromium installation and the browser suite.

## Live evaluation

Run `npm run evaluate:ai -- --live` to invoke the configured model for four authored scenarios: female shortlist, male shortlist, explicit preference request, and an ambiguous/unsupported request. An optional `--model=...` selects a model for that run without editing credentials. The script saves model, prompt versions, timestamp, latency, checks and limited fictional output samples in [AI-EVALUATION.json](AI-EVALUATION.json). It does not write profiles, preferences, notes or sends.

On 20 October 2026 the originally configured `gemini-3.8-flash` returned 503/504 responses, including a minimal connection check. Its first four-case run could not demonstrate successful generation. `gemini-3.5-flash-lite` was listed as available to the same key, passed a generation check, and passed the four-case evaluation. It is the new default. The application remains usable through visibly labeled fallback behavior when the provider is unavailable. Automatic SDK retries are disabled; the request has an explicit abort deadline so a provider outage cannot keep the interface waiting for minutes.

The [provider pricing page](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.5-flash-lite) lists free-tier input/output for this model. Availability and account-specific quotas still require verification. The [structured-output documentation](https://ai.google.dev/gemini-api/docs/structured-output) explicitly calls for application-side value validation and handling of semantically incorrect output.

## What passing means

Membership and evidence checks prove that displayed review items refer to supplied eligible profiles and that supporting facts come from the correct pair. Candidate-specific explanations are assembled by the server from the evidence IDs selected by AI and their canonical comparison states. An early free-form explanation overstated a work-schedule difference during manual QA; prompt version review-2 removes candidate-specific free-form claims from the output schema rather than relying on a stronger prompt alone. The summary and suggested questions remain generated. Validation does not prove that every generated sentence is factually supported, that the suggested order is optimal, or that two people will be compatible. Canonical unresolved concerns are displayed independently of AI text. A matchmaker must review the order/questions and approve preference changes and mock sends.

This small synthetic evaluation is a smoke check, not a calibrated recommendation benchmark. Real product evaluation would require consented customer feedback, larger reviewed cases and outcome definitions. Matchmaker decisions do not automatically train or adjust the engine.
