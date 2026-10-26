# Company Portal

A responsive React web app with a public welcome page, secure login, and a dashboard (carousel, navigation tabs, tiles) whose content is managed in **Google Sheets**. Hosted free on **GitHub Pages**.

```
Browser (React on GitHub Pages)  --POST-->  Google Apps Script Web App  --reads-->  Private Google Sheet
        no secrets, no Sheet ID               checks password hash, signs token       Users / Carousel / Tabs / Tiles
```

**Why an Apps Script backend?** A static site cannot keep secrets. If React read the Sheet directly, anyone could open dev tools and see every user's credentials. The Apps Script sits in between: the Sheet stays private, passwords are only stored as salted hashes, and content is returned only for a valid, expiring, signed token.

## Features

- Main Page with Login button; Login page with validation, show/hide password, loading state and clear error messages
- Dashboard: auto-sliding carousel (arrows, dots, swipe, pause on hover), navigation tabs, responsive tile grid
- Carousel, tabs and tiles all come from Google Sheets (edit a row, refresh, done: no redeploy)
- Protected routes; logout clears the session and returns to the Main Page; direct URLs are blocked after logout
- Sessions expire after 2 hours; locked for 15 minutes after 5 failed logins; disabling a user in the Sheet revokes access immediately

## Project structure

```
apps-script/Code.gs        Backend (paste into Google Apps Script)
sheets-template/*.csv      Sheet templates (alternative to the built-in setup menu)
src/
  App.jsx, main.jsx        Routes and entry point (HashRouter)
  config.js                Public settings (API URL, app name)
  context/AuthContext.jsx  Session state: login(), logout(), auto-expiry
  routes/ProtectedRoute    Blocks /app/* without a session
  services/api.js          Calls to the Apps Script backend
  services/mockApi.js      DEV-ONLY sample backend (not included in production builds)
  hooks/useContent.js      Loads carousel/tabs/tiles with loading + error state
  components/              Navbar, Carousel, TileGrid, Loader, ErrorMessage, ...
  pages/                   Main, Login, Dashboard, Reports, Services, Settings, ModulePage, NotFound
  styles/global.css        Design tokens and shared styles
  test/                    Vitest tests
.github/workflows/deploy.yml   Test + build + publish to GitHub Pages
```

---

## Setup

### Part 1 - Google Sheet and backend (about 10 minutes)

1. Create a new Google Sheet (any name, e.g. "Company Portal Data"). **Keep it private. Do not share it or "publish to web".**
2. Open **Extensions > Apps Script**. Delete the sample code, paste the entire contents of `apps-script/Code.gs`, and click **Save**.
3. Reload the Sheet. A new menu **Portal Admin** appears (you may need to authorize it the first time: Google will warn the script is unverified because you wrote it; choose *Advanced > Go to project*).
4. Click **Portal Admin > 1. Create sheets with sample data**. This creates the `Users`, `Carousel`, `Tabs` and `Tiles` tabs.
   *(Alternative: create the four tabs yourself and import the files in `sheets-template/`.)*
5. Click **Portal Admin > 2. Add or update a user...** and answer the prompts (username, email, name, role, password of at least 10 characters with letters and numbers). The script stores only a salted hash and a salt. **The password is never written to the Sheet.** Google shows the text while you type, so do this privately.
6. Deploy the backend: **Deploy > New deployment > type: Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy** and authorize. Copy the **Web app URL** (ends in `/exec`).

   "Anyone" only means the URL is reachable. Login and a valid signed token are still required for any data.
7. Quick check: open the URL in a browser. You should see `{"ok":true,"data":{"status":"running"}}`.

> **Updating the script later:** after editing `Code.gs`, use **Deploy > Manage deployments > Edit (pencil) > Version: New version > Deploy**. The URL stays the same.

### Part 2 - Run locally

Requires Node.js 18+ (20 recommended).

```bash
npm install
cp .env.example .env.local        # Windows: copy .env.example .env.local
```

Edit `.env.local` and set `VITE_API_URL` to your Web app URL, then:

```bash
npm run dev       # http://localhost:5173
npm test          # automated tests
npm run build     # production build into dist/
```

**Try the UI without Google:** set `VITE_USE_MOCK=true` in `.env.local` and log in with `demo` / `Demo@12345`. This works only in `npm run dev`; the mock code is stripped from production builds.

### Part 3 - Push to GitHub

Create an empty repository on github.com (for example `company-portal`; do not add a README or .gitignore there), then in the project folder:

```bash
git init
git add .
git commit -m "Initial commit: Company Portal"
git branch -M main
git remote add origin https://github.com/<your-username>/company-portal.git
git push -u origin main
```

Run `git status` before committing. `.env.local` must **not** appear: it is in `.gitignore`.

### Part 4 - Deploy to GitHub Pages

1. In the repository: **Settings > Pages > Build and deployment > Source: GitHub Actions**.
2. **Settings > Secrets and variables > Actions > Variables tab > New repository variable**
   - Name: `VITE_API_URL`, Value: your Apps Script Web app URL
   - Optional: `VITE_APP_NAME` for a custom app name
3. Push to `main` (or run **Actions > Deploy to GitHub Pages > Run workflow**). The workflow runs the tests, builds, and publishes.
4. Your live site: `https://<your-username>.github.io/<repo-name>/`

The Web app URL goes in an Actions **variable** (not a secret) because it is public by design; it is visible in the built JavaScript either way.

---

## Managing content in Google Sheets

Edit the Sheet and refresh the app. No redeploy needed. Set `active` to `FALSE` to hide a row; rows are sorted by `order`.

| Sheet | Columns |
|---|---|
| Users | `username`, `email`, `name`, `passwordHash`, `salt`, `role`, `active` (use the Portal Admin menu; do not type hashes by hand) |
| Carousel | `id`, `title`, `text`, `imageUrl`, `linkUrl`, `linkText`, `order`, `active` |
| Tabs | `id`, `label`, `path`, `icon`, `order`, `active` (a tab with path `/logout` is the Logout button) |
| Tiles | `id`, `title`, `description`, `icon`, `path`, `order`, `active` |

- **Icons:** `home`, `reports`, `services`, `settings`, `logout`, `users`, `docs`, `support`, `calendar`, `bell`
- **Paths:** `/app/home`, `/app/reports`, `/app/services`, `/app/settings`. Any tile with path `/app/module/<name>` opens a generic page showing the tile's title and description. Add real pages in `src/pages` and register them in `src/App.jsx`.
- **Images:** must be `https://` URLs. Links must be in-app paths (starting with `/`) or `http(s)` URLs; anything else (like `javascript:`) is ignored.
- **Disable a user:** set `active` to `FALSE`. Their existing session stops working on the next request.

## Security notes

- No passwords, hashes, secrets or Sheet IDs exist in the frontend or the repository. The token signing secret is generated automatically and kept in Apps Script *Script Properties*.
- Passwords: salted, iterated SHA-256 (the strongest option available in Apps Script, which has no bcrypt/argon2). Use long, unique passwords.
- Tokens are HMAC-signed and expire after 2 hours; stored in `sessionStorage` (cleared when the tab closes). Run `rotateTokenSecret` in the Apps Script editor to log everyone out.
- The route guard in React is a convenience; the real protection is that the backend returns **no content without a valid token**.
- **Limits:** this is suitable for an internal portal or demo. There is no per-request server-side session revocation list and throttling is simple. For a high-risk public production system, use a managed identity provider (Firebase Auth, Auth0, etc.) or a dedicated backend.
- Apps Script has daily quotas; fine for small teams, not for heavy traffic.

## Troubleshooting

| Problem | Fix |
|---|---|
| "Unable to reach the server" | Check `VITE_API_URL` is the `/exec` URL and the deployment access is **Anyone**. Redeploy a new version after code changes. |
| Login always says invalid | Re-create the user via the Portal Admin menu. Make sure `active` is `TRUE`. |
| "Too many failed attempts" | Wait 15 minutes. |
| Blank page on GitHub Pages | Make sure Settings > Pages > Source is **GitHub Actions** and the workflow succeeded. |
| Menu "Portal Admin" missing | Reload the Sheet; make sure the script was opened from **Extensions > Apps Script** of that Sheet. |
| Dashboard says content failed to load | Open the Apps Script **Executions** page to see errors; confirm the four tabs exist with the header names above. |
