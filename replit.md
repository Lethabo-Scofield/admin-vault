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
  - `/` dashboard, `/projects`, `/projects/[id]`, `/credentials`,
    `/compliance`, `/audit-logs`, `/settings`, and a public `/login`.
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

Tables (snake_case): `projects`, `credentials`, `documents`, `audit_logs`.
Credentials and documents cascade-delete with their project. The schema is
created automatically on first DB access.

## Authentication

- Admin-only. A single admin signs in with `ADMIN_EMAIL` + `ADMIN_PASSWORD`.
- Session is a stateless HMAC-signed cookie (`vault_session`, `httpOnly`,
  `sameSite=lax`, `secure` in prod, 7-day expiry), verified in `proxy.ts`.
- No empty-secret fallback: if no signing secret is configured, tokens are
  rejected and login is impossible (prevents forged cookies).

## Environment / Secrets

- `DATABASE_URL` — Replit's built-in PostgreSQL connection string (managed
  automatically by Replit). The DB client uses `prepare:false`; SSL is
  conditional — disabled for the local `helium`/localhost proxy (which does not
  speak TLS), `"require"` for any external host.
- `ADMIN_PASSWORD` — **required** for login. Also used as the session-signing
  key when `SESSION_SECRET` is unset. Stored in Replit Secrets.
- `ADMIN_EMAIL` — admin login email (defaults to `admin@olyxee.com`).
- `SESSION_SECRET` — optional dedicated HMAC key for session cookies; falls back
  to `ADMIN_PASSWORD`. Changing the signing key invalidates existing sessions.

## Development

- Workflow "Start application" runs `npm run dev` (`next dev` on `0.0.0.0:5000`).
- Deployment: autoscale, `build = npm run build`, `run = npm run start`.

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
