---
name: Gapless intern/credential numbering
description: Business rule — intern and credential numbers must stay gapless and self-heal; PDFs embed the credential number.
---
Rule: intern numbers (OLX-INT-NNNN) and credential numbers (OLX-CERT-YYYY-NNNN, per-year) must always be a gapless sequence ordered by created_at. They are mutable labels, resequenced on create/delete and self-healed on list-page load under pg_advisory_xact_lock('counter:intern'/'counter:credential').

**Why:** user explicitly wants no gaps after deletions; published PDFs print the credential number, so renumbering must regenerate stored documents. A `docs_stale` flag is set in the same transaction as renumbering and only cleared by a successful conditional regeneration write — failed renders retry on next heal. Verification links are safe: lookup is by token only, never by number.

**How to apply:** never treat these numbers as immutable identifiers; any new create/delete/import path must take the advisory lock and resequence, and anything embedding the number in stored artifacts must respect `docs_stale`.
