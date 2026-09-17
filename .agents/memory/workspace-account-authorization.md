---
name: Workspace account authorization
description: Durable identity and permission rules for Super Admin and invited supervisors.
---

The configured default admin email is reserved for Super Admin. Invited workspace accounts sign in with their own email and the shared workspace password, and only active invited accounts may authenticate.

**Why:** Supervisors must be individually identifiable and removable without changing the shared password, while the default administrator identity must never be usable as a normal workspace account.

**How to apply:** Treat database account status and permissions as authoritative on protected server requests. Session claims may support edge behavior, but must not delay suspension or permission removal. Permanent deletion, account management, audit access, company documents, analytics connections, and official credential publishing/revocation remain Super Admin-only.