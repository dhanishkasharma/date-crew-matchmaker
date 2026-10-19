# Render API and Vercel frontend

The repository is [dhanishkasharma/date-crew-matchmaker](https://github.com/dhanishkasharma/date-crew-matchmaker). Deploy from `main` using Node.js 22.

## Request flow

```text
Browser → Vercel React frontend
        → /api/* rewrite → Render Express API → MongoDB Atlas
                                             → Gemini (draft requests only)
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
3. Open Ananya's suggested matches and generate a Gemini introduction. Confirm the source reads Gemini draft; cancel without sending.
4. Confirm direct links to customer routes load the app.
5. Sign in as Rohan to verify assignment isolation if testing authorization changes.

Render's free service can spin down when idle, so the first request may be slow. Data and sessions remain in Atlas. All customer profiles and sends in this assessment are fictional or simulated.

References: [Vercel external rewrites](https://vercel.com/docs/routing/rewrites), [Render Node version selection](https://render.com/docs/node-version), [Render free service behavior](https://render.com/docs/free).
