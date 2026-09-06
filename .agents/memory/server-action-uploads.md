---
name: Server Action file uploads
description: Constraints for uploading files through Next.js Server Actions in this app (body limit, "use server" exports).
---
- Server Action body limit is set to 12 MB in next.config.ts (experimental.serverActions.bodySizeLimit) for intern document uploads (per-file cap 10 MB in the action).
- A file over the framework limit aborts the request with "Unexpected end of form" and a 500 — the action never runs, so the friendly error can't come from the server. Always pre-check file.size client-side before submitting.
- "use server" files may only export async functions (and types). Exporting a constant from one breaks *every* action on the page at runtime with "A 'use server' file can only export async functions".

**Why:** hit both during the intern documents feature; the second one took a full e2e run to surface.
**How to apply:** any new upload form → client size check + keep constants out of action files.
