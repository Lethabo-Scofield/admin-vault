---
name: Supabase pooler + postgres.js
description: Connection settings for the Supabase transaction pooler and how to read its error messages.
---

- Transaction pooler (port 6543) needs `prepare: false` and `ssl: "require"` in postgres.js.
- Error triage from Vercel function logs:
  - "password authentication failed for user postgres" → wrong password in the URL (not the username).
  - "Tenant or user not found" (`XX000`, FATAL, from Supavisor) → the pooler doesn't know the project: project is **paused** (free tier auto-pauses after ~7 days idle), deleted/re-created with a new ref, or the URL points at the wrong region pooler host. Not a code bug; restore the project in the Supabase dashboard or update `SUPABASE_DB_URL` in Vercel.
- Quick production probe without logs: `GET /api/public/credentials/<bogus-token>` should return 404; a 500 there means DB access itself is broken, while `/login` rendering fine rules out the session secret.

**Why:** Production hides Server Component error messages; these fingerprints let us diagnose from the digest log line alone (incident on 2026-09-06 was a paused/unknown tenant).
**How to apply:** Whenever admin.olyxee.com shows the generic "error in Server Components render", probe the public API first, then read the Vercel log line.
