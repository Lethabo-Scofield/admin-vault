---
name: Replit built-in Postgres via helium proxy
description: The local DATABASE_URL host "helium" does not speak TLS; ssl must be off locally.
---

Replit's built-in PostgreSQL is reached in development through a local proxy
whose hostname is `helium` (check `new URL(DATABASE_URL).hostname`). This proxy
does **not** support TLS.

**Why:** Connecting with `ssl: "require"` (postgres.js) fails on every query
with `Client network socket disconnected before secure TLS connection was
established` — pages may still return 200 while data fetching silently errors,
making it look like a random network problem.

**How to apply:** Make SSL conditional on the host: disable it for
`helium`/`localhost`/`127.0.0.1`, require it for external hosts (e.g. Supabase
poolers). Keep `prepare: false` for pooled/proxied connections.
