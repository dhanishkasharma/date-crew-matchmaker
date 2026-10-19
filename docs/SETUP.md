# TDC setup — MongoDB Atlas and Gemini

The project lives in `C:\Users\saara\Matchmaker`. Use Node.js 22 or newer. The frontend runs at `http://127.0.0.1:5173`; Express runs at `http://127.0.0.1:4000`.

## 1. MongoDB Atlas (free cluster)

1. Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).
2. Create a project named **TDC Matchmaker**.
3. Create a **Free / M0** cluster. Choose a nearby available region; avoid selecting a paid tier.
4. Under **Database Access**, create a database user such as `tdc_app`. This is different from your Atlas website login. Give it **readWrite** access to the `tdc_matchmaker` database. Save its generated password privately.
5. Under **Network Access**, add your current public IP. The backend machine's IP must be allowed; add your hosting provider's outbound IPs when deploying.
6. Open the cluster's **Connect → Drivers → Node.js** instructions. Copy the `mongodb+srv://...` connection string.
7. Replace the password placeholder with your database user's password, URL-encoding special characters. Set the database path to `tdc_matchmaker` before the query string. Example with placeholders only:

```dotenv
MONGODB_URI=mongodb+srv://tdc_app:YOUR_ENCODED_PASSWORD@YOUR_CLUSTER.mongodb.net/tdc_matchmaker?retryWrites=true&w=majority
```

The app creates its collections and seeds fictional data automatically on first launch. You do not need to load Atlas sample data. Repeated launches preserve notes, preferences, sends, and existing accounts.

Official reference: [Connect to an Atlas cluster](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/).

### Development before Atlas is ready

Leave `MONGODB_URI` empty. In development, the app downloads MongoDB 8.0.17 once and starts a real local database, storing records in `.data/mongodb`. This is not a browser-storage or fake-database fallback. First startup needs an internet connection and can take a few minutes. Do not start two app instances against the same local data directory.

Production requires your Atlas URI and does not start a local development database. Local and Atlas data are separate; switching the URI creates a fresh seeded workspace in the target database.

## 2. Gemini API key (free tier)

1. Open [Google AI Studio API keys](https://aistudio.google.com/apikey) and sign in with your Google account.
2. Accept the terms if prompted. New accounts may receive a default project/key; otherwise choose **Create API key** and create/select a project.
3. Copy the key into `GEMINI_API_KEY` in your local `.env`. Do not paste it into the browser UI, chat, or source code.
4. Check the project's model access and rate limits in AI Studio. Use a text model listed as available on its free tier. The app defaults to `gemini-3.8-flash`, which passed the live connection check; change `GEMINI_MODEL` if your project requires another supported text model. A model may remain listed but return a not-found error when used; test generation rather than relying on the listing alone.
5. Keep the project on its free tier for this assessment. Free usage is limited by quota, not a promised cash-credit balance. Availability and limits depend on model, account, and region. A paid billing upgrade is not required for eligible free-tier use.
6. Restart the backend after changing `.env`. Open an eligible match, click **Send match**, then **Generate with Gemini**. The draft is labeled **Gemini AI draft** only after a successful API response. Missing keys, errors, and quota exhaustion produce an explicitly labeled template.

Official references: [API keys](https://ai.google.dev/gemini-api/docs/api-key), [pricing and eligible free models](https://ai.google.dev/gemini-api/docs/pricing), [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).

Only fictional profile context is sent to Gemini. Phone numbers, email, date of birth, income, caste, religion, and private notes are excluded from the generation payload. Review free-tier data-use terms before substituting real customer records.

## 3. Run the project

From PowerShell in `C:\Users\saara\Matchmaker`:

```powershell
rtk npm install
rtk npm run setup
```

The setup command creates `.env` with a random session secret, preserving existing files. Edit `.env` locally to add the Atlas URI and Gemini key; leave them empty if you want to inspect the app before connecting accounts. Then launch:

```powershell
rtk npm run dev
```

Open [the local app](http://127.0.0.1:5173).

| Username | Password       | Assigned customers |
| -------- | -------------- | ------------------ |
| `priya`  | `TdcDemo2026!` | 10                 |
| `rohan`  | `TdcDemo2026!` | 2                  |

These credentials are public assessment credentials for fictional records. The second account demonstrates assignment isolation.

```powershell
rtk npm run typecheck
rtk npm test
rtk npm run lint
rtk npm run build
rtk npm run test:e2e
```

## 4. Hosting later

Build with `npm run build`, start with `npm start`, and configure `NODE_ENV=production`, `MONGODB_URI`, `SESSION_SECRET` (at least 32 random characters), `APP_ORIGIN` (exact HTTPS origin), `GEMINI_API_KEY`, and `GEMINI_MODEL` on a Node-compatible host. Express serves the built React app from one origin. Allow the backend host's egress IPs in Atlas. HTTPS is required for secure production session cookies. No hosting account is provisioned by this local build.
