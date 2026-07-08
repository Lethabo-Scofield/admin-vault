import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

const globalForDb = globalThis as unknown as {
  __sql?: Sql;
  __schemaReady?: Promise<void>;
};

function getConnectionString(): string | undefined {
  // DATABASE_URL is the canonical name (Replit's built-in PostgreSQL).
  // Vercel's Postgres/Neon integrations expose POSTGRES_URL variants, and the
  // Vercel production project stores its Supabase URL as SUPABASE_DB_URL.
  return (
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING
  );
}

export function getSql(): Sql {
  const connectionString = getConnectionString();
  if (!connectionString) {
    throw new Error(
      "No database connection string found. Set DATABASE_URL (or POSTGRES_URL) in this environment. On Replit, provision the built-in PostgreSQL database; on Vercel, add the variable under Settings → Environment Variables for Production and redeploy."
    );
  }
  if (!globalForDb.__sql) {
    // Replit's built-in PostgreSQL is reached through a local proxy (e.g.
    // host "helium") that does not speak TLS; external hosts require it.
    const host = new URL(connectionString).hostname;
    const isLocal =
      host === "helium" || host === "localhost" || host === "127.0.0.1";
    globalForDb.__sql = postgres(connectionString, {
      prepare: false,
      ssl: isLocal ? false : "require",
      max: 5,
      idle_timeout: 20,
      connect_timeout: 15,
    });
  }
  return globalForDb.__sql;
}

const SCHEMA_SQL = `
create table if not exists projects (
  id           serial primary key,
  name         text not null,
  category     text not null default '',
  description  text not null default '',
  logo_url     text not null default '',
  created_at   timestamptz not null default now()
);

alter table projects add column if not exists logo_url text not null default '';

create table if not exists credentials (
  id            serial primary key,
  project_id    integer not null references projects(id) on delete cascade,
  service_name  text not null,
  environment   text not null default '',
  secret_value  text not null default '',
  owner_email   text not null default '',
  department    text not null default '',
  status        text not null default 'Active',
  created_at    timestamptz not null default now()
);

create table if not exists documents (
  id               serial primary key,
  project_id       integer not null references projects(id) on delete cascade,
  file_name        text not null,
  file_size_bytes  bigint not null default 0,
  sha256           text not null default '',
  uploaded_at      timestamptz not null default now(),
  uploaded_by      text not null default '',
  classification   text not null default ''
);

create table if not exists audit_logs (
  id           serial primary key,
  timestamp    timestamptz not null default now(),
  action       text not null default '',
  actor_email  text not null default '',
  actor_role   text not null default '',
  ip_address   text not null default '',
  status       text not null default 'SUCCESS'
);

create index if not exists idx_credentials_project on credentials(project_id);
create index if not exists idx_documents_project on documents(project_id);
create index if not exists idx_audit_timestamp on audit_logs(timestamp desc);
`;

export function ensureSchema(): Promise<void> {
  // On Replit, the production schema is managed by the publish flow; never run
  // DDL at request time there. On other hosts (e.g. Vercel) nothing else
  // creates the tables, so run the idempotent DDL once per process.
  const isReplitProduction =
    process.env.NODE_ENV === "production" &&
    Boolean(process.env.REPLIT_DEPLOYMENT || process.env.REPL_ID);
  if (isReplitProduction) {
    return Promise.resolve();
  }
  if (!globalForDb.__schemaReady) {
    const sql = getSql();
    globalForDb.__schemaReady = sql
      .unsafe(SCHEMA_SQL)
      .then(() => undefined)
      .catch((err) => {
        // Reset so a later request can retry schema creation.
        globalForDb.__schemaReady = undefined;
        throw err;
      });
  }
  return globalForDb.__schemaReady;
}
