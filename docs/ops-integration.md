# Olyxee Admin ↔ Olyxee Ops integration

Olyxee Admin is authoritative for stable people identities, employment status,
organisational functions, job titles, and reporting relationships. Olyxee Ops is
authoritative for objectives, tasks, deliverables, weekly reports, and progress.

Admin writes an outbox row to `ops_sync_events` in the same transaction as an
organisation change. The event key is unique, so retries are safe. Ops consumes
events through `GET /api/internal/ops/sync`, processes them idempotently using
`eventKey`, then acknowledges them with `POST /api/internal/ops/sync`.

Authentication uses the shared `OPS_SYNC_SECRET` request header. The secret is
server-only and must never be exposed in the browser. Consumers should retry
non-2xx responses with backoff and preserve the event payload for auditability.

Current event types:

- `ORGANISATION_FUNCTION_UPSERTED`
- Future `PERSON_UPSERTED`, `PERSON_STATUS_CHANGED`, and
  `REPORTING_LINE_CHANGED` events should use the same envelope.

Example event envelope:

```json
{
  "eventKey": "organisation-function:12:1730000000000",
  "eventType": "ORGANISATION_FUNCTION_UPSERTED",
  "aggregateId": "12",
  "payload": { "id": 12, "name": "Engineering", "leaderEmail": "" }
}
```

The contract intentionally does not assume that Ops shares the Admin schema or
that either system can synchronously write to the other database.
