-- Orbit FC — Postgres schema (Supabase). Run this once in the SQL editor.
-- Mirrors src/lib/types.ts; the org hierarchy (org → portfolio → building → unit)
-- plus borough + client tags makes the system scale to 40 / 400 / 4000 buildings.
-- RLS policies live in policies.sql (run that second).

create extension if not exists "pgcrypto";

-- ── org hierarchy ─────────────────────────────────────────────────────────
create table if not exists orgs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists portfolios (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  name        text not null,
  lead_user_id uuid,                      -- FK to app_users (set after users exist)
  created_at  timestamptz not null default now()
);

-- internal staff + external personas, each linked to a Supabase auth user
create table if not exists app_users (
  id          uuid primary key references auth.users(id) on delete cascade,
  org_id      uuid not null references orgs(id) on delete cascade,
  persona     text not null check (persona in ('operator','board','resident','vendor','super')),
  role        text,                        -- operator role: principal/director/am/field/manager/sales/marketing/dispatch
  name        text not null,
  email       text,
  title       text,
  initials    text,
  color       text,
  company     text,                        -- vendor personas
  building_id uuid,                        -- primary building (board/resident/super)
  created_at  timestamptz not null default now()
);

create table if not exists buildings (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references orgs(id) on delete cascade,
  portfolio_id  uuid references portfolios(id) on delete set null,
  am_user_id    uuid references app_users(id) on delete set null,  -- account/property manager
  code          text not null,
  name          text not null,
  address       text,
  borough       text,                      -- Manhattan/Brooklyn/Queens/... for geo + reporting
  client_name   text,                      -- the legal entity (condo/co-op/HOA association)
  type          text check (type in ('Condo','Co-op','HOA')),
  plan          text check (plan in ('Pro','Lite')),
  units         int default 0,
  lat           double precision,
  lng           double precision,
  mono          text,
  reserve       numeric, operating numeric, delinquency numeric,
  monthly_income numeric, monthly_expense numeric,
  compliance    text check (compliance in ('ok','review','alert')) default 'ok',
  created_at    timestamptz not null default now()
);

create table if not exists units (
  id          uuid primary key default gen_random_uuid(),
  building_id uuid not null references buildings(id) on delete cascade,
  label       text not null,               -- "14C"
  line        text, floor text,
  owner_user_id uuid references app_users(id) on delete set null
);

-- supers / staff covering more than one building
create table if not exists user_buildings (
  user_id     uuid not null references app_users(id) on delete cascade,
  building_id uuid not null references buildings(id) on delete cascade,
  primary key (user_id, building_id)
);

-- ── vendors ───────────────────────────────────────────────────────────────
create table if not exists vendors (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  name        text not null,
  trades      text[] default '{}',
  phone       text, email text,
  grade       int, rating numeric,
  coi_expiry  date,
  created_at  timestamptz not null default now()
);

-- ── tickets (the work) ──────────────────────────────────────────────────────
create table if not exists tickets (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references orgs(id) on delete cascade,
  building_id   uuid not null references buildings(id) on delete cascade,
  unit_id       uuid references units(id) on delete set null,
  ref           text,                       -- human id e.g. "T-4801"
  title         text not null,
  description   text,
  type          text, category text,
  prio          text check (prio in ('Critical','High','Normal','Low')) default 'Normal',
  status        text check (status in ('Open','Assigned','In progress','Awaiting review','Closed')) default 'Open',
  assignee_user_id uuid references app_users(id) on delete set null,  -- OWNER
  requester     text,
  vendor_id     uuid references vendors(id) on delete set null,
  team          text,                       -- frontdesk/facilities/super/compliance/finance/legal/leasing
  held          jsonb,                      -- { reason, at }
  held_ms       bigint default 0,           -- banked SLA-paused time
  escalate_at   timestamptz,
  work_date     date,
  parent_id     uuid references tickets(id) on delete set null,
  merged_into   uuid references tickets(id) on delete set null,
  verified      boolean default false,
  created_at    timestamptz not null default now()
);
create index if not exists tickets_building_idx on tickets(building_id);
create index if not exists tickets_status_idx on tickets(status);

-- append-only audit spine
create table if not exists ticket_events (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references orgs(id) on delete cascade,
  building_id   uuid references buildings(id) on delete cascade,
  entity_type   text not null,              -- ticket/building/vendor/emergency/channel/integration
  entity_id     text not null,
  actor_user_id uuid references app_users(id) on delete set null,
  kind          text not null,              -- ticket.created / notice.sent / emergency.step ...
  summary       text,
  at            timestamptz not null default now()
);
create index if not exists ticket_events_building_idx on ticket_events(building_id);

create table if not exists ticket_messages (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     uuid not null references tickets(id) on delete cascade,
  dir           text check (dir in ('in','out')) not null,
  audience      text, channels text[],
  body          text not null,
  by_user_id    uuid references app_users(id) on delete set null,
  sender_label  text,
  at            timestamptz not null default now()
);

create table if not exists ticket_comments (   -- internal notes
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references tickets(id) on delete cascade,
  by_user_id  uuid references app_users(id) on delete set null,
  body        text not null,
  at          timestamptz not null default now()
);

-- ── communications, notices, emergencies, docs, integrations ────────────────
create table if not exists notices (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  building_id uuid references buildings(id) on delete cascade,  -- null = portfolio-wide
  title       text not null, body text,
  audience    text, channels text[],
  status      text check (status in ('Sent','Scheduled','Draft')) default 'Sent',
  urgent      boolean default false, reach int default 0,
  at          timestamptz not null default now()
);

create table if not exists emergencies (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references orgs(id) on delete cascade,
  building_id   uuid not null references buildings(id) on delete cascade,
  ref           text,
  title         text not null, type text,
  sev           text check (sev in ('critical','high','watch')) default 'critical',
  status        text check (status in ('potential','active','resolved')) default 'active',
  step          text default 'confirm',
  on_behalf     text, channel text,
  linked_ticket_id uuid references tickets(id) on delete set null,
  created_at    timestamptz not null default now()
);

create table if not exists emergency_log (
  id            uuid primary key default gen_random_uuid(),
  emergency_id  uuid not null references emergencies(id) on delete cascade,
  text          text not null, actor text,
  at            timestamptz not null default now()
);

create table if not exists building_docs (
  id            uuid primary key default gen_random_uuid(),
  building_id   uuid not null references buildings(id) on delete cascade,
  name          text not null, kind text,
  system        text, vendor text,
  storage_path  text,                       -- Supabase Storage object path
  by_user_id    uuid references app_users(id) on delete set null,
  at            timestamptz not null default now()
);

create table if not exists integrations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  connector   text not null,                -- gmail/twilio/quickbooks/...
  connected   boolean default false,
  config      jsonb,
  unique (org_id, connector)
);

-- helpful timestamp trigger could be added per-table as needed.
