import type { Sql, TransactionSql } from "postgres";
import { getInternCredentialInternal } from "@/lib/intern-queries";
import {
  generateCertificatePdf,
  generateCertificatePng,
  generateLetterPdf,
} from "@/lib/documents/generate";

type AnySql = Sql<Record<string, never>> | TransactionSql<Record<string, never>>;

/**
 * Force intern numbers into a gapless 1..N sequence (ordered by creation) and
 * sync the counter. Callers that run this alongside inserts/deletes must hold
 * pg_advisory_xact_lock(hashtext('counter:intern')) inside a transaction.
 */
export async function resequenceInternNumbers(tx: AnySql): Promise<void> {
  // Two-phase update to avoid unique-constraint collisions mid-update.
  await tx`update interns set intern_number = 'TMP-' || id`;
  await tx`
    with ordered as (
      select id, row_number() over (order by created_at, id) as rn from interns
    )
    update interns
    set intern_number = 'OLX-INT-' || lpad(ordered.rn::text, 4, '0')
    from ordered
    where interns.id = ordered.id
  `;
  await tx`
    insert into number_counters (name, value)
    values ('intern', (select count(*)::int from interns))
    on conflict (name) do update
    set value = (select count(*)::int from interns)
  `;
}

/**
 * Self-heal stale numbering (e.g. data created before the gapless-numbering
 * rule): if any intern's stored number differs from its expected 1..N value,
 * repair the whole sequence. Cheap read when everything is already correct.
 */
export async function ensureSequentialInternNumbers(sql: Sql<Record<string, never>>): Promise<void> {
  const [row] = await sql<{ stale: boolean }[]>`
    select exists (
      select 1 from (
        select intern_number,
               'OLX-INT-' || lpad(row_number() over (order by created_at, id)::text, 4, '0') as want
        from interns
      ) t
      where intern_number <> want
    ) as stale
  `;
  if (!row?.stale) return;
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext('counter:intern'))`;
    await resequenceInternNumbers(tx);
  });
}

/**
 * Force credential numbers into a gapless per-year sequence
 * (OLX-CERT-YYYY-0001…N, ordered by creation) and sync the per-year counters.
 * Non-draft credentials whose number changed get `docs_stale = true` in the
 * SAME transaction — their stored PDFs print the old number. The flag is only
 * cleared by a successful regeneration, so a crashed/failed render is retried
 * by the next self-heal instead of being silently lost.
 * Returns those ids so callers can regenerate immediately.
 * Callers must hold pg_advisory_xact_lock(hashtext('counter:credential')).
 */
export async function resequenceCredentialNumbers(
  tx: AnySql
): Promise<number[]> {
  const before = await tx<{ id: number; num: string; status: string }[]>`
    select id, credential_number as num, status from intern_credentials
  `;
  await tx`update intern_credentials set credential_number = 'TMP-' || id`;
  await tx`
    with ordered as (
      select id,
             extract(year from created_at)::int as yr,
             row_number() over (
               partition by extract(year from created_at)::int
               order by created_at, id
             ) as rn
      from intern_credentials
    )
    update intern_credentials
    set credential_number =
      'OLX-CERT-' || ordered.yr || '-' || lpad(ordered.rn::text, 4, '0')
    from ordered
    where intern_credentials.id = ordered.id
  `;
  await tx`delete from number_counters where name like 'cert-%'`;
  await tx`
    insert into number_counters (name, value)
    select 'cert-' || extract(year from created_at)::int, count(*)::int
    from intern_credentials
    group by 1
  `;
  const after = await tx<{ id: number; num: string; status: string }[]>`
    select id, credential_number as num, status from intern_credentials
  `;
  const beforeNum = new Map(before.map((r) => [r.id, r.num]));
  const changed = after
    .filter((r) => r.status !== "DRAFT" && beforeNum.get(r.id) !== r.num)
    .map((r) => r.id);
  if (changed.length > 0) {
    await tx`
      update intern_credentials set docs_stale = true
      where id = any(${changed}::int[])
    `;
  }
  return changed;
}

/**
 * Regenerate and store the documents of published/revoked credentials whose
 * number changed — the certificate and letter print the credential code, so
 * stale PDFs would show the old number. Verification links are unaffected
 * (lookup is by token, never by number).
 *
 * Concurrency-safe: the write is conditional on the credential number still
 * being the one that was rendered, and `docs_stale` is cleared in the same
 * conditional update. If a concurrent resequence renumbered the credential
 * mid-render, the write is a no-op and the flag stays set for a retry.
 * A failed render for one credential does not block the others.
 */
export async function regenerateCredentialDocuments(
  sql: Sql<Record<string, never>>,
  ids: number[]
): Promise<void> {
  for (const id of ids) {
    try {
      const cred = await getInternCredentialInternal(id);
      if (!cred) continue;
      const [certificatePdf, letterPdf, certificatePng] = await Promise.all([
        generateCertificatePdf(cred),
        generateLetterPdf(cred),
        generateCertificatePng(cred),
      ]);
      await sql`
        update intern_credentials
        set certificate_pdf = ${certificatePdf},
            letter_pdf = ${letterPdf},
            certificate_preview_png = ${certificatePng},
            docs_stale = false,
            updated_at = now()
        where id = ${id}
          and credential_number = ${cred.credentialNumber}
      `;
    } catch (err) {
      // Leave docs_stale set — the next self-heal retries this credential.
      console.error(`Failed to regenerate documents for credential ${id}:`, err);
    }
  }
}

/**
 * Self-heal credential numbering and documents:
 * 1. If any stored number differs from its expected gapless per-year value,
 *    resequence (marks affected non-draft rows docs_stale).
 * 2. Regenerate documents for every row still flagged docs_stale — including
 *    ones left over from an earlier failed or interrupted regeneration.
 */
export async function ensureSequentialCredentialNumbers(
  sql: Sql<Record<string, never>>
): Promise<void> {
  const [row] = await sql<{ stale: boolean }[]>`
    select exists (
      select 1 from (
        select credential_number,
               'OLX-CERT-' || yr || '-' || lpad(rn::text, 4, '0') as want
        from (
          select credential_number,
                 extract(year from created_at)::int as yr,
                 row_number() over (
                   partition by extract(year from created_at)::int
                   order by created_at, id
                 ) as rn
          from intern_credentials
        ) t
      ) t2
      where credential_number <> want
    ) as stale
  `;
  if (row?.stale) {
    await sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(hashtext('counter:credential'))`;
      await resequenceCredentialNumbers(tx);
    });
  }
  const pending = await sql<{ id: number }[]>`
    select id from intern_credentials
    where docs_stale and status <> 'DRAFT'
    order by id
  `;
  if (pending.length > 0) {
    await regenerateCredentialDocuments(sql, pending.map((r) => r.id));
  }
}
