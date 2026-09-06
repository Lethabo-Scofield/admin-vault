# Olyxee Admin

Olyxee's internal admin website (formerly "Olyxee Vault"). Manage projects, see
each product's real usage (users, last activity, what they did) from its own
database, store API keys/secrets, track compliance documents (with SHA-256
checksums), run the internship programme, and view an immutable audit trail.

## Project analytics ("Traffic & Users")

- Each project can be connected to its application's PostgreSQL database via the
  **Database** button on `/projects/[id]` (`components/AnalyticsDbForm.tsx`).
  The URL is verified with a live query (`testConnection`), then stored
  AES-256-GCM encrypted in `projects.analytics_db_url_enc` (`lib/crypto.ts`,
  key derived from `SESSION_SECRET`; rotating it invalidates stored URLs). Only
  the hostname (`analytics_db_host`) is shown back. Connect/disconnect writes
  audit entries.
- `lib/analytics.ts` reads (never writes) the standard Olyxee app schema:
  `public.users` (`last_active_at`), `public.audit_logs` (action/entity/
  metadata per user), `public.businesses`, `public.orders`, and optionally
  Supabase `auth.users`/`auth.sessions` for device/IP (matched by email). Each
  section degrades independently when a table is missing and surfaces a note
  rather than fabricating numbers. Connection failures render an explicit error
  card with the DB message. Pools are cached per URL (max 2 conns).
- UI: `components/ProjectAnalytics.tsx` — stat cards, users list with presence
  buckets (active today / this week / this month / inactive), 14-day activity
  bars, top actions (30 d), recent activity feed. Action names are humanised via
  `humanizeAction` ("UPDATE_ORDER_STATUS" → "Updated order status").
- First connected product: **Olyxee Logistics** (Supabase, transaction pooler
  URL). Its users authenticate with the app's own password hashes, not Supabase
  Auth, so device/IP data is unavailable for them.
- Dev: the Logistics URL is also available as the Replit secret
  `OLYXEE_LOGISTICS_DATABASE_URL` for inspection; the app itself reads only the
  per-project stored URL. On Vercel nothing extra is needed — the URL lives in
  the admin database.

## Tech Stack

- **Next.js (App Router) + React + TypeScript**
- **Tailwind CSS v4** — iOS-inspired design (frosted glass, soft shadows,
  continuous-corner radii, skeleton shimmer loaders). Light + dark themes.
- **postgres.js** — server-side data access to **Replit's built-in PostgreSQL**
- **lucide-react** — icons

## Architecture

- `app/` — App Router pages. Each data page is `force-dynamic` and fetches via
  server components. Route-level `loading.tsx` files provide skeleton states.
  - `/` dashboard, `/projects`, `/projects/[id]`, `/project-keys` (the
    engineer-facing secrets vault, formerly `/credentials`), `/compliance`,
    `/audit-logs`, `/settings`, and a public `/login`.
  - Super-admin-only: `/interns` (+ `/new`, `/[id]`), `/credentials`
    (internship credentials: list, `/new`, `/[id]`, `/[id]/preview`),
    . Public read-only API:
    `GET /api/public/credentials/[verificationToken]` (narrow CORS for
    olyxee.com; returns only published-safe fields; revoked returns number +
    status only).
- `proxy.ts` — route protection (Next 16's renamed `middleware`). Redirects
  unauthenticated requests to `/login`, and signed-in users away from `/login`.
  Matches all routes except Next internals and static files. Imports only
  edge-safe code from `lib/auth.ts` (no `next/headers`).
- `components/` — `AppShell` (responsive sidebar + mobile drawer, logout,
  Settings link), reusable UI (`ui.tsx`, `Skeleton.tsx`), client widgets
  (forms, `SecretCell`, search tables), `LoginForm`, `ThemeToggle`.
- `lib/`
  - `db.ts` — lazy postgres.js client + `ensureSchema()` (runs `CREATE TABLE IF
    NOT EXISTS` once per process). Reads `DATABASE_URL`.
  - `queries.ts` — read functions (snake_case columns aliased to camelCase).
  - `actions.ts` — server actions for create/update/delete project, add/update/
    delete credential, and upload document, each writing an audit log entry
    attributed to the signed-in admin (via `requireUser()`). Project logos are
    optional uploads (≤1 MB, PNG/JPEG/WebP/GIF/SVG) stored as base64 data URLs
    in `projects.logo_url`; editing a credential with a blank secret keeps the
    existing value.
  - `format.ts` — display helpers (secret masking, file size, checksum, initials,
    accent color, environment colors).
  - `auth.ts` — edge-safe session crypto (Web Crypto HMAC), credential check,
    and `create`/`verifySessionToken`. Used by the proxy and server actions;
    never imports `next/headers`.
  - `session.ts` — `getCurrentUser` (nullable) / `requireUser` read the session
    cookie via `next/headers`; supply the actor for audit attribution.
  - `auth-actions.ts` — `login`/`logout` server actions (set/clear the cookie).

## Database

Tables (snake_case): `projects`, `credentials`, `documents`, `audit_logs`,
`interns`, `intern_credentials`, `number_counters` (atomic, never-reused
intern/credential number allocation via upsert-increment; unique constraints on
intern_number, credential_number, verification_token).
Credentials and documents cascade-delete with their project. The schema is
created automatically on first DB access.

## Authentication & Roles

- Two roles, both signing in on the same `/login` page (no usernames stored in
  DB): the entered password decides the role.
  - `SUPERADMIN_PASSWORD_HASH` (bcrypt) or `SUPERADMIN_PASSWORD` -> `SUPER_ADMIN`
  - `ENGINEER_PASSWORD_HASH` (bcrypt) or `ENGINEER_PASSWORD` -> `FOUNDER_ENGINEER`
  - `ADMIN_PASSWORD` (engineering team's normal password; used on Vercel) -> `FOUNDER_ENGINEER`
  - `demo`/`demo` (non-production only) -> `SUPER_ADMIN`
- Role is embedded in the signed session token; `proxy.ts` returns **403** for
  non-super-admin requests to `/interns`, `/credentials`.
  Every super-admin query/action also calls `requireSuperAdmin()` server-side
  (`lib/session.ts`). Engineers see a redacted audit trail (intern/credential
  entries filtered out in `getAuditLogs`).
- Login is rate-limited in-memory (5 attempts / 15 min per IP) and audited
  (success, failure, logout). Password checks use bcrypt (`lib/passwords.ts`,
  Node-only — never imported from `proxy.ts`).
- Session is a stateless HMAC-signed cookie (`vault_session`, `httpOnly`,
  `sameSite=lax`, `secure` in prod, 7-day expiry), verified in `proxy.ts`.
- No empty-secret fallback: if no signing secret is configured, tokens are
  rejected and login is impossible (prevents forged cookies).

## Environment / Secrets

- `DATABASE_URL` — Replit's built-in PostgreSQL connection string (managed
  automatically by Replit). The DB client uses `prepare:false`; SSL is
  conditional — disabled for the local `helium`/localhost proxy (which does not
  speak TLS), `"require"` for any external host. When `DATABASE_URL` is unset,
  the client falls back to `SUPABASE_DB_URL` (the name used in the Vercel
  project) and Vercel-style names (`POSTGRES_URL`, `POSTGRES_PRISMA_URL`,
  `POSTGRES_URL_NON_POOLING`) so the same code runs on Vercel. `ensureSchema()` skips request-time DDL only on Replit production
  (detected via `REPLIT_DEPLOYMENT`/`REPL_ID`); on other hosts (e.g. Vercel) it
  runs the idempotent `CREATE TABLE IF NOT EXISTS` schema once per process.
- `SUPERADMIN_PASSWORD_HASH` / `ENGINEER_PASSWORD_HASH` — bcrypt hashes for
  the two roles (preferred, esp. on Vercel). Plain `SUPERADMIN_PASSWORD` /
  `ENGINEER_PASSWORD` Replit Secrets are also accepted.
- `ADMIN_PASSWORD` — the engineering team's normal password (grants
  FOUNDER_ENGINEER); this is the variable used on Vercel alongside
  `SUPERADMIN_PASSWORD`. Also used as the session-signing
  key when `SESSION_SECRET` is unset. Stored in Replit Secrets.
- `ADMIN_EMAIL` — admin login email (defaults to `admin@olyxee.com`).
- `SESSION_SECRET` — optional dedicated HMAC key for session cookies; falls back
  to `ADMIN_PASSWORD`. Changing the signing key invalidates existing sessions.

## Development

- Workflow "Start application" runs `npm run dev` (`next dev` on `0.0.0.0:5000`).
- Replit's package firewall blocks `next` < 16.3.3; the lockfile pins 16.3.4.
- Local login: `demo` / `demo` (both fields) outside production.
- Deployment: autoscale, `build = npm run build`, `run = npm run start`.

## Generated Documents (Certificate & Recommendation Letter)

- `lib/documents/` — deterministic HTML/CSS templates (no LLMs): `certificate.ts`
  (A4 landscape), `letter.ts` (A4 portrait), `fields.ts` (pronoun map, a/an
  article, duration from dates, issue-date validation, file names, escaping),
  `branding.ts` (official logo + seal PNGs from assets/branding embedded as data URLs; company name is always
  "Olyxee (Pty) Ltd"), `qr.ts` (dynamic QR, error correction H), `pdf.ts`
  (puppeteer-core + system chromium via `which chromium`; override with
  `CHROMIUM_PATH`), `generate.ts` (render + PDF orchestration).
- Pronouns (SHE_HER/HE_HIM/THEY_THEM) are selected explicitly on the intern
  form — never inferred from names; blank falls back to they/them.
- The credential form never re-asks intern-profile fields: position,
  department, pronouns, and start/completion dates are shown read-only and
  re-synced from the intern row on every credential save (create and update);
  published saves re-validate dates and regenerate the stored PDFs.
- Publish validates start/completion dates, generates both PDFs BEFORE
  flipping status, and stores them as bytea on `intern_credentials`. Editing a
  published credential regenerates the stored PDFs; the verification URL and
  QR never change. Draft previews are generated live
  (`/credentials/[id]/certificate|letter`, `?format=html` for HTML,
  `?download=1` for attachment).
- Public verify page `/verify/[code]` (no auth, Cache-Control: no-store);
  the token is extracted by stripping the `OLX-CERT-YYYY-NNNN-` prefix
  (base64url tokens can contain hyphens — never split on "-"). Revoked shows
  number + revoked message only; unknown/service-error states have fixed copy.
  Public PDF downloads: `/api/public/credentials/[token]/certificate|letter`
  (PUBLISHED only, else 404).
- Tests: `npm test` (vitest, `tests/documents.test.ts`) — pronouns (no mixed
  pronouns), articles, duration, issue-date rules, file names, QR decodes to
  the exact URL, credential-number format, template escaping.

## Internship Programme (interns, projects, documents)

- **Access**: `/interns` (list, create, edit, archive, projects, documents,
  tasks) is open to every signed-in admin — super admins *and* founder
  engineers (`requireUser`). Issuing/managing official credentials
  (`/credentials`, the "Credentials Issued" section) and permanently deleting an
  intern stay `requireSuperAdmin`; the detail page hides those controls for
  engineers and `proxy.ts` 403s `/credentials` for them.
- **Programme goal**: 3 projects in 3 months. `interns.planned_end_date`
  defaults to `start_date + 3 months` (month-end clamped) when left blank;
  `interns.project_goal` defaults to 3 (1–20). `lib/intern-progress.ts`
  (pure, unit-tested) computes days left, time %, projects done vs goal, and a
  state: not_started / on_track / behind (fewer done than the steady-pace
  expectation) / overdue / completed / withdrawn / unscheduled. Shown in
  `InternProgressCard` on the detail page and as columns on the list.
- **Projects**: `intern_projects` (title, description, link, status
  IN_PROGRESS|COMPLETED, started_at, completed_at). Full CRUD in
  `components/InternProjects.tsx` via `lib/intern-project-actions.ts`.
  `projectsDone` = count of COMPLETED rows. The older free-text
  `projects_completed` field remains the certificate write-up.
- **Documents**: `intern_documents` stores uploaded NDA / acceptance letter /
  ID / CV / other files as `bytea` (PDF, doc/docx, png/jpg/webp; ≤10 MB;
  sha256 recorded). Upload via `uploadInternDocument` (`useActionState`);
  download/preview only through the authenticated route
  `/interns/[id]/documents/[docId]` (`?inline=1` for PDF/images, otherwise
  attachment, nosniff). `next.config.ts` raises the Server Action body limit
  to 12 MB for this.
- **Roster**: list filters Active / Completed / All (+ include archived);
  "Completed" means employment_status = Completed; Withdrawn shows under All.
- Schema additions are in `SCHEMA_SQL` and auto-apply on Vercel via
  `ensureSchema()` (they are idempotent `add column if not exists` /
  `create table if not exists`).

## Internship Credentials

- Workflow: create intern -> draft credential -> preview -> publish (assigns
  issue date, permanent URL `https://olyxee.com/verify/OLX-CERT-YYYY-NNNN-<token>`)
  -> QR panel (copy URL, open, PNG/SVG download, print) -> optional revoke.
- Verification token: `crypto.randomBytes(9).toString("base64url")` — random,
  non-sequential, never derived from personal data. URL never changes after
  publication; editing public info updates content only.
- QR codes generated server-side (`qrcode` pkg, 1024px PNG + SVG, margin 4).

## Notes

- Secrets are stored in plaintext; the "AES-256" label in the UI is presentational
  only (no real encryption layer is implemented).
- Dark mode is class-based (`.dark` on `<html>`), toggled from Settings and
  persisted to `localStorage`; a `beforeInteractive` script prevents flash, and
  `<html suppressHydrationWarning>` avoids the theme-class hydration warning.
  Dark styles are centralized in `app/globals.css` as `.dark`-scoped overrides
  of the neutral utility palette (so pages need no per-element `dark:` variants).

## User preferences

- Prefers Next.js (App Router) over other React setups for this project.
