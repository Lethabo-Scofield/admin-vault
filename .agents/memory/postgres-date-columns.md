---
name: postgres.js date columns
description: postgres.js returns SQL `date` columns as JS Date objects; cast to text in SELECTs when code expects ISO strings.
---

Rule: when app code (forms, validators, templates) expects `YYYY-MM-DD` strings, select SQL `date` columns as `col::text` instead of relying on the driver value.

**Why:** postgres.js hands back `date` columns as JS `Date` objects. `String(date).slice(0,10)` yields "Mon Apr 20", which silently empties `<input type=date>` defaults, breaks ISO regex validation, and produced a "published credential edit always fails validation" bug here.

**How to apply:** in query column lists, use `start_date::text as "startDate"` etc.; keep helpers like `parseIsoDate` defensive (accept `Date | string`).
