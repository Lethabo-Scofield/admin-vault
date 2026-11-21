# Olyxee Admin redesign assessment

## Preserved capability

The existing application already provides project management, encrypted analytics
connections, credential management, compliance uploads with SHA-256 checksums,
intern tracking, PDF certificate and letter generation, public verification,
server-side permission checks, signed sessions, and an audit trail.

## Changes implemented in this phase

- Project credential values now use AES-256-GCM at rest. Existing plaintext rows
  are migrated once and cleared in the same database transaction.
- The existing Interns module remains the single People record; the profile now
  includes a dedicated Certificates tab so identity and issuance stay together.
- Organisation functions are available as database-backed integration
  foundations without adding a competing navigation module.
- Organisation changes enqueue idempotent Ops sync events rather than writing to
  the Ops database directly.
- A protected Ops outbox endpoint and contract document define polling,
  acknowledgement, retry, and authentication behavior.

## Remaining production work

The next implementation slice should add a first-class employee table with
historical employment records, resource-scoped roles, MFA for privileged users,
server-side reveal actions that keep secrets out of ordinary page payloads,
document versioning and approvals, and a real Ops consumer after its API contract
is confirmed. These are intentionally not simulated against production data.
