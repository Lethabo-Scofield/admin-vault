import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

const globalForDb = globalThis as unknown as {
  __sql?: Sql;
  __schemaReady?: Promise<void>;
};

export function getSql(): Sql {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not configured. Provision the built-in PostgreSQL database."
    );
  }
  if (!globalForDb.__sql) {
    globalForDb.__sql = postgres(connectionString, {
      prepare: false,
      ssl: "require",
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
  created_at   timestamptz not null default now()
);

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
  // In production the schema is managed by Replit's publish flow; never run
  // DDL at request time there.
  if (process.env.NODE_ENV === "production") {
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
