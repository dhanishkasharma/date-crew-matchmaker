# Custom matching logic

**AI integration.** A server-side Gemini integration drafts a short personalized introduction from selected profile facts and deterministic compatibility evidence. The model never decides eligibility or supplies the compatibility index. Its response is constrained to subject, introduction, and discussion question, validated with Zod, and reviewed by the matchmaker. Private notes, phone numbers, email, exact DOB, caste, religion, and income are omitted from generation. Missing credentials, quota failures, and invalid output use a visibly labeled template. Live generation has been verified with the user's privately configured key using gemini-3.8-flash; low reasoning effort and a bounded token allowance leave room for a complete structured draft.

**Algorithm design.** Eligibility comes first: verified and available opposite-gender candidates must meet mutual dealbreakers. For male customers, the brief additionally requires a younger, shorter woman with lower comparable annual income and exactly matching children preferences. Female-customer matching uses declared preferences and compatibility across life plans (30%), values/lifestyle (25%), feasible location (20%), career support/work schedule (15%), and communication/interests (10%). Preference fit is calculated in both directions and combined using a harmonic mean, reducing one-sided fits. Factual reasons, tradeoffs, evidence coverage, and component scores accompany each suggestion.

**Assumptions.** Profiles are fictional adults, verification is simulated, and opposite-gender matching is the exercise scope. Male-specific comparisons implement the supplied assessment policy rather than universal preferences. Missing hard-rule fields cannot pass; Maybe means unresolved. Relocation requires an actual feasible city, not just two Yes flags. Unknown soft fields receive neutral fit with zero evidence coverage, without reallocating their weight. The index is a heuristic, not a probability of relationship success. Caste, religion, appearance, college prestige, and family wealth do not contribute default points.

## Score details

- Within each component, average its documented subcriteria. Life plans includes children, marriage timeline, and declared age range; a flexible age range influences rank without excluding a candidate. Exact agreement scores 1; an explicit flexible/partial answer scores 0.5; a known conflict scores 0. Unknown values score 0.5 and carry no evidence coverage. A known Any preference is flexibility, not missing information.
- Shared declared values and interests are directional overlap fractions. Shared-language fit requires at least one common language. A partner's career-support answer and schedule fit contribute to career compatibility without ranking professions by prestige.
- Combine weighted directional scores as `2ab / (a + b)`, or zero if both are zero. Pair coverage is the lower weighted directional coverage.
- High potential: index at least 80, coverage at least 80%, and no unresolved children/location question. Worth exploring: index at least 65 and coverage at least 60%. Otherwise: Needs discussion.
- Stable ordering: score, coverage, profile ID. Scores are recomputed from current preferences before sending; policy version `tdc-1.0` is persisted in each send record.
- Exclusion counters overlap because one candidate can fail several rules. The UI says so explicitly.

Weights and thresholds are initial heuristics. Tests use constructed expectations; random synthetic data does not establish real-world recommendation accuracy.
