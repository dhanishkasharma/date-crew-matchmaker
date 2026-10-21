# Render API and Vercel frontend

The repository is [dhanishkasharma/date-crew-matchmaker](https://github.com/dhanishkasharma/date-crew-matchmaker). Deploy from `main` using Node.js 22.

## Request flow

```text
Browser → Vercel React frontend
        → /api/* rewrite → Render Express API → MongoDB Atlas
                                             → Gemini (review, preference preview, drafts)
```

The frontend calls relative `/api` URLs. Vercel proxies those requests to Render, preserving a single browser origin for session cookies. Keep the `HttpOnly`, `Secure`, `SameSite=Lax` session cookie; cross-site cookies and broad CORS access are unnecessary. API responses must not be cached.

## Render

- Service: `date-crew-matchmaker-api`
- Build: `npm ci --include=dev && npm run build:server`
- Start: `npm start`
- Health check: `/api/health`
- Plan: Free
- Environment: `NODE_ENV=production`, `NODE_VERSION=22.22.0`, `MONGODB_URI`, `SESSION_SECRET`, `APP_ORIGIN`, `GEMINI_API_KEY`, `GEMINI_MODEL`.

Set `APP_ORIGIN` to the exact Vercel production HTTPS origin. Use a fresh, randomly generated production session secret. Keep credentials in Render's environment, outside Git and frontend variables. Atlas must permit the backend's outbound addresses.

`render.yaml` records the equivalent service configuration. This initial service was created from the public Git repository URL. Check the dashboard's source integration before relying on automatic deploys; use Manual Deploy to deploy a later commit when necessary.

## Vercel

- Framework: Vite
- Build: `npm run build:client`
- Output: `dist/client`
- Root directory: repository root
- No database or Gemini secrets in Vercel.

`vercel.json` sends `/api/*` to the Render service and serves `index.html` for frontend routes. It disables caching for API proxy responses. If either production domain changes, update the rewrite destination or Render's `APP_ORIGIN` accordingly.

## Atlas network access

Render uses these outbound ranges: `74.220.49.0/24` and `74.220.57.0/24`. The Atlas allowlist was updated for those ranges and the API was successfully redeployed. Preserve this access for the running demo; recheck the service’s Connect menu if its region changes.

## Verified production URLs

- [Live application](https://date-crew-matchmaker.vercel.app)
- [API health](https://date-crew-matchmaker-api.onrender.com/api/health)
- [GitHub source](https://github.com/dhanishkasharma/date-crew-matchmaker)

Verified on 19 October 2026: direct/proxied health, both demo logins, secure cookie attributes, session persistence after browser refresh, 10/2 customer assignment lists, the 200-profile pool, a 404 for cross-owner customer access, and a live Gemini draft. One initial Gemini 504 timeout exercised the labeled template fallback; a subsequent request succeeded. No real email was sent.

## Verify after deployment

1. Confirm `/api/health` returns `{ "ok": true }` through Vercel.
2. Sign in with `priya / TdcDemo2026!`, then refresh to verify the session persists.
3. Open Ananya's suggested matches, review the shortlist with AI, then open Send Match and Generate with AI. Confirm the source reads AI draft; cancel without sending. A provider failure must keep the rules/template path usable and labeled honestly.
4. Confirm direct links to customer routes load the app.
5. Sign in as Rohan to verify assignment isolation if testing authorization changes.
6. Open partner preferences → Describe with AI. Preview a request, verify that nothing saved yet, and inspect the proposed changes and counts. Cancel to preserve the demo, or explicitly Apply when testing persistence.

The 20 October enhancement release needs no new environment variables or database collections. Existing legacy demo text can be updated explicitly with `npm run demo:refresh-text` (dry run) and `npm run demo:refresh-text -- --apply`. This replaces only known legacy bio/career text on known seeded profile IDs; it never resets notes, sends or preferences. It does not run on application startup. In-memory AI previews expire on restart and must be regenerated.

The explicit legacy-text migration was applied to the configured Atlas database on 20 October: 424 legacy text fields were replaced across the 212 seeded profiles. Operational records and preferences were preserved. Set the existing `GEMINI_MODEL` environment variable to `gemini-3.5-flash-lite` for the enhancement release; the same existing key is used.

## Enhancement rollout verified — 21 October 2026

The updated frontend and API are live. Render successfully deployed application commit `a6528ed2938f5ba8f421b45030417ef667fb8d31` using Node.js 22.22.0; its existing `GEMINI_MODEL` setting is now `gemini-3.5-flash-lite`. The existing API key, Atlas connection and session secret are preserved. The successful [Render deployment](https://dashboard.render.com/web/srv-dbb1gn49v7es73abnc20/deploys/dep-dbc51a5g1s2s7393313g) completed its health check and is Live. [GitHub checks](https://github.com/dhanishkasharma/date-crew-matchmaker/actions/runs/39376998823) passed for this application commit. Later documentation-only commits do not require another API deployment.

Verified through the public Vercel origin:

- API health, both demo logins and bootstrap returned HTTP 200. Priya received 10 customers, Rohan 2, and both received 200 candidates. Rohan's request for Priya's customer returned 404.
- Authenticated bootstrap reports `aiConfigured: true` and `aiAssistanceAvailable: true`, so the new controls are enabled. A browser refresh retained the session and the direct customer route.
- Review with AI successfully returned an eight-candidate review with ordering controls and saved profile evidence.
- Describe with AI interpreted the example age/city/non-smoking request and showed a preview of 64 eligible profiles becoming 39. It remained labeled Not saved and was cancelled without applying changes.
- Generate with AI produced an editable AI draft in Send Match. The draft was cancelled; no new mock email was recorded.

Current hosted evidence: [AI shortlist](screenshots/hosted-ai-shortlist.png), [preference preview](screenshots/hosted-ai-preferences.png), and [AI introduction](screenshots/hosted-ai-introduction.png). The optional capability field remains in place so future independent frontend/API rollouts keep the earlier workflow usable.

Render's free service can spin down when idle, so the first request may be slow. Data and sessions remain in Atlas. All customer profiles and sends in this assessment are fictional or simulated.

References: [Vercel external rewrites](https://vercel.com/docs/routing/rewrites), [Render Node version selection](https://render.com/docs/node-version), [Render free service behavior](https://render.com/docs/free).
