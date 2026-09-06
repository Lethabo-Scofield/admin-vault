---
name: Replit npm firewall
description: Replit's package-firewall blocks vulnerable next versions; how to pick an allowed one.
---
Rule: if `npm ci`/`npm install` fails with `403 Blocked by Security Policy` for `next`, probe `http://package-firewall.replit.local/npm/next/-/next-<v>.tgz` with curl for candidate versions and install the lowest allowed patch (as of 2026-09-06: 16.3.3+; lockfile had 16.2.12).
**Why:** The workflow fails with "next: command not found" when node_modules is missing, which looks like a config problem but is really the blocked install.
**How to apply:** After any fresh import/clone or lockfile pin to an old Next patch.
