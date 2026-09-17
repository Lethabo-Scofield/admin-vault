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
alter table projects add column if not exists analytics_db_url_enc text not null default '';
alter table projects add column if not exists analytics_db_host text not null default '';
alter table projects add column if not exists status text not null default 'ACTIVE';
alter table projects add column if not exists suspended_at timestamptz;

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
alter table documents add column if not exists mime_type text not null default 'application/octet-stream';
alter table documents add column if not exists content bytea;

create table if not exists audit_logs (
  id           serial primary key,
  timestamp    timestamptz not null default now(),
  action       text not null default '',
  actor_email  text not null default '',
  actor_role   text not null default '',
  ip_address   text not null default '',
  status       text not null default 'SUCCESS'
);

create table if not exists interns (
  id                         serial primary key,
  intern_number              text not null unique,
  full_name                  text not null,
  position                   text not null default '',
  department                 text not null default '',
  start_date                 date,
  completion_date            date,
  employment_status          text not null default 'Active',
  projects_completed         text not null default '',
  responsibilities           text not null default '',
  skills_demonstrated        text not null default '',
  supervisor_name            text not null default '',
  supervisor_recommendation  text not null default '',
  internal_notes             text not null default '',
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  archived_at                timestamptz
);

alter table interns add column if not exists email text not null default '';
alter table interns add column if not exists pronouns text not null default '';

create table if not exists intern_credentials (
  id                     serial primary key,
  intern_id              integer not null references interns(id) on delete restrict,
  credential_number      text not null unique,
  verification_token     text not null unique,
  programme_title        text not null default '',
  position               text not null default '',
  start_date             date,
  completion_date        date,
  projects_completed     text not null default '',
  skills_demonstrated    text not null default '',
  public_recommendation  text not null default '',
  issue_date             date,
  status                 text not null default 'DRAFT',
  published_at           timestamptz,
  revoked_at             timestamptz,
  revocation_reason      text not null default '',
  created_by             text not null default '',
  updated_by             text not null default '',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

alter table intern_credentials add column if not exists department text not null default '';
alter table intern_credentials add column if not exists pronouns text not null default '';
alter table intern_credentials add column if not exists responsibilities text not null default '';
alter table intern_credentials add column if not exists founder_name text not null default '';
alter table intern_credentials add column if not exists founder_title text not null default '';
alter table intern_credentials add column if not exists founder_recommendation text not null default '';
alter table intern_credentials add column if not exists manager_name text not null default '';
alter table intern_credentials add column if not exists manager_title text not null default '';
alter table intern_credentials add column if not exists manager_recommendation text not null default '';
alter table intern_credentials add column if not exists certificate_pdf bytea;
alter table intern_credentials add column if not exists letter_pdf bytea;
alter table intern_credentials add column if not exists certificate_preview_png bytea;
alter table intern_credentials add column if not exists email_sent_at timestamptz;
alter table intern_credentials add column if not exists email_sent_to text not null default '';
alter table intern_credentials add column if not exists docs_stale boolean not null default false;

create table if not exists intern_tasks (
  id          serial primary key,
  intern_id   integer not null references interns(id) on delete cascade,
  title       text not null,
  description text not null default '',
  status      text not null default 'ASSIGNED',
  pr_link     text not null default '',
  review_note text not null default '',
  assigned_by text not null default '',
  due_date    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_intern_tasks_intern on intern_tasks(intern_id);

-- Internship programme goal tracking: 3 projects in 3 months by default.
alter table interns add column if not exists planned_end_date date;
alter table interns add column if not exists project_goal integer not null default 3;

create table if not exists intern_projects (
  id           serial primary key,
  intern_id    integer not null references interns(id) on delete cascade,
  title        text not null,
  description  text not null default '',
  link         text not null default '',
  status       text not null default 'IN_PROGRESS',
  started_at   date,
  completed_at date,
  created_by   text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_intern_projects_intern on intern_projects(intern_id);

-- One-time-compatible backfill for project lists saved before intern_projects
-- became the single project-entry source. It is safe to run repeatedly.
with legacy_lists as (
  select id as intern_id, projects_completed as project_list, completion_date
  from interns
  where trim(projects_completed) <> ''
  union all
  select intern_id, projects_completed as project_list, completion_date
  from intern_credentials
  where trim(projects_completed) <> ''
),
legacy_titles as (
  select
    intern_id,
    completion_date,
    regexp_replace(
      trim(raw_title),
      '^([-*•▪◦‣–—]|[0-9]+[.)])[[:space:]]*',
      ''
    ) as title
  from legacy_lists
  cross join lateral regexp_split_to_table(project_list, E'[\\n,;]+') as raw_title
),
deduplicated_titles as (
  select distinct on (intern_id, lower(title))
    intern_id, title, completion_date
  from legacy_titles
  where title <> ''
  order by intern_id, lower(title), completion_date desc nulls last
)
insert into intern_projects
  (intern_id, title, status, completed_at, created_by)
select
  legacy.intern_id,
  legacy.title,
  'COMPLETED',
  legacy.completion_date,
  'Imported from previous project list'
from deduplicated_titles legacy
where not exists (
  select 1
  from intern_projects current_project
  where current_project.intern_id = legacy.intern_id
    and lower(trim(current_project.title)) = lower(trim(legacy.title))
);

-- Uploaded paperwork (NDA, acceptance letter, ...). Bytes live in the database
-- so the same record works on Replit and Vercel without object storage.
create table if not exists intern_documents (
  id          serial primary key,
  intern_id   integer not null references interns(id) on delete cascade,
  kind        text not null default 'OTHER',
  file_name   text not null,
  mime_type   text not null default 'application/octet-stream',
  size_bytes  integer not null default 0,
  sha256      text not null default '',
  content     bytea not null,
  note        text not null default '',
  uploaded_by text not null default '',
  uploaded_at timestamptz not null default now()
);

create index if not exists idx_intern_documents_intern on intern_documents(intern_id);

create table if not exists number_counters (
  name   text primary key,
  value  integer not null default 0
);

create index if not exists idx_intern_credentials_intern on intern_credentials(intern_id);

-- One-time flag: QR base URL is olyxee.com/verify. Marks existing
-- published/revoked documents stale so the self-heal regenerates their QR
-- codes. The counter row makes this idempotent across restarts.
with flag as (
  insert into number_counters (name, value) values ('qr-olyxee-verify-v2', 1)
  on conflict (name) do nothing
  returning 1
)
update intern_credentials set docs_stale = true
where status <> 'DRAFT' and exists (select 1 from flag);
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
