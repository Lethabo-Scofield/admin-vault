import type { Sql, TransactionSql } from "postgres";

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
      select id, row_number() over (order by id) as rn from interns
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
               'OLX-INT-' || lpad(row_number() over (order by id)::text, 4, '0') as want
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
