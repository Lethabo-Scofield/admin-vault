# Olyxee Vault

A secure credentials & compliance vault admin app. Manage projects, store API
keys/secrets, track compliance documents (with SHA-256 checksums), and view an
immutable audit trail.

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
    `/team-access`. Public read-only API:
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
  - Legacy `ADMIN_PASSWORD` (matching `ADMIN_EMAIL`) -> `SUPER_ADMIN`
  - `demo`/`demo` (non-production only) -> `SUPER_ADMIN`
- Role is embedded in the signed session token; `proxy.ts` returns **403** for
  non-super-admin requests to `/interns`, `/credentials`, `/team-access`.
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
- `ADMIN_PASSWORD` — legacy single-admin login (grants SUPER_ADMIN). Also used as the session-signing
  key when `SESSION_SECRET` is unset. Stored in Replit Secrets.
- `ADMIN_EMAIL` — admin login email (defaults to `admin@olyxee.com`).
- `SESSION_SECRET` — optional dedicated HMAC key for session cookies; falls back
  to `ADMIN_PASSWORD`. Changing the signing key invalidates existing sessions.

## Development

- Workflow "Start application" runs `npm run dev` (`next dev` on `0.0.0.0:5000`).
- Deployment: autoscale, `build = npm run build`, `run = npm run start`.

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
