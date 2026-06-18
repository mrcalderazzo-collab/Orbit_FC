-- Orbit FC — ONE-PASTE installer. Run this whole file once in the Supabase SQL Editor.
-- (schema + RLS policies + seed, in order.)

-- ===== schema.sql =====
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


-- ===== policies.sql =====
-- Orbit FC — Row-Level Security. Run AFTER schema.sql. This makes the persona /
-- portfolio scoping from identity.ts (isOrgWide / operatorBuildings / can) real at
-- the database: every query is filtered by who you are, not by trusting the client.

-- ── helper functions (security definer so they can read app_users) ──────────
create or replace function me() returns app_users language sql stable security definer as $$
  select * from app_users where id = auth.uid();
$$;

create or replace function my_org() returns uuid language sql stable security definer as $$
  select org_id from app_users where id = auth.uid();
$$;

-- org-wide visibility: owners/principals/directors/managers/dispatch + growth
create or replace function is_org_wide() returns boolean language sql stable security definer as $$
  select exists (
    select 1 from app_users u where u.id = auth.uid()
      and u.persona = 'operator'
      and coalesce(u.role,'') in ('principal','director','manager','dispatch','sales','marketing')
  );
$$;

-- the building ids the current user may see
create or replace function my_building_ids() returns setof uuid language sql stable security definer as $$
  -- org-wide operators: every building in their org
  select b.id from buildings b
    where b.org_id = my_org() and is_org_wide()
  union
  -- account managers: the buildings they own
  select b.id from buildings b
    where b.am_user_id = auth.uid()
  union
  -- super/board/resident: their primary building
  select u.building_id from app_users u
    where u.id = auth.uid() and u.building_id is not null
  union
  -- multi-building staff (e.g. supers covering a cluster)
  select ub.building_id from user_buildings ub
    where ub.user_id = auth.uid()
  union
  -- vendors: buildings where they have awarded/assigned work
  select t.building_id from tickets t join app_users u on u.id = auth.uid()
    where u.persona = 'vendor' and t.vendor_id in (select id from vendors v where v.name = u.company);
$$;

-- can this user take write actions on building-bound work? (operators only;
-- read-only personas insert through narrower policies below)
create or replace function can_write() returns boolean language sql stable security definer as $$
  select exists (select 1 from app_users u where u.id = auth.uid() and u.persona = 'operator');
$$;

-- ── enable RLS ──────────────────────────────────────────────────────────────
alter table orgs            enable row level security;
alter table portfolios      enable row level security;
alter table app_users       enable row level security;
alter table buildings       enable row level security;
alter table units           enable row level security;
alter table user_buildings  enable row level security;
alter table vendors         enable row level security;
alter table tickets         enable row level security;
alter table ticket_events   enable row level security;
alter table ticket_messages enable row level security;
alter table ticket_comments enable row level security;
alter table notices         enable row level security;
alter table emergencies     enable row level security;
alter table emergency_log   enable row level security;
alter table building_docs   enable row level security;
alter table integrations    enable row level security;

-- ── org-scoped reference data (everyone in the org reads; operators write) ───
create policy org_read   on orgs       for select using (id = my_org());
create policy pf_read    on portfolios for select using (org_id = my_org());
create policy pf_write   on portfolios for all using (org_id = my_org() and is_org_wide()) with check (org_id = my_org());
create policy users_read on app_users  for select using (org_id = my_org());
create policy users_self on app_users  for update using (id = auth.uid());
create policy vend_read  on vendors    for select using (org_id = my_org());
create policy vend_write on vendors    for all using (org_id = my_org() and can_write()) with check (org_id = my_org());

-- ── buildings + units: scoped to portfolio ──────────────────────────────────
create policy b_read  on buildings for select using (id in (select my_building_ids()));
create policy b_write on buildings for update using (id in (select my_building_ids()) and is_org_wide());
create policy u_read  on units     for select using (building_id in (select my_building_ids()));
create policy ub_read on user_buildings for select using (user_id = auth.uid() or is_org_wide());

-- ── tickets: read within portfolio; operators write within portfolio; ────────
--    residents may open tickets in their own building ──
create policy t_read   on tickets for select using (building_id in (select my_building_ids()));
create policy t_write  on tickets for all
  using (building_id in (select my_building_ids()) and can_write())
  with check (building_id in (select my_building_ids()) and can_write());
create policy t_resident_open on tickets for insert
  with check (
    building_id in (select my_building_ids())
    and exists (select 1 from app_users u where u.id = auth.uid() and u.persona in ('resident','board','super'))
  );

-- ── ticket children: visible if the parent ticket is visible ─────────────────
create policy te_read  on ticket_events   for select using (building_id in (select my_building_ids()) or org_id = my_org() and is_org_wide());
create policy te_write on ticket_events   for insert with check (org_id = my_org());
create policy tm_read  on ticket_messages for select using (ticket_id in (select id from tickets));
create policy tm_write on ticket_messages for insert with check (ticket_id in (select id from tickets));
create policy tc_read  on ticket_comments for select using (ticket_id in (select id from tickets where building_id in (select my_building_ids())) and can_write());
create policy tc_write on ticket_comments for insert with check (can_write());

-- ── notices / emergencies / docs ─────────────────────────────────────────────
create policy n_read  on notices for select using (building_id is null and org_id = my_org() or building_id in (select my_building_ids()));
create policy n_write on notices for all using (org_id = my_org() and can_write()) with check (org_id = my_org());
create policy em_read  on emergencies for select using (building_id in (select my_building_ids()));
create policy em_write on emergencies for all using (building_id in (select my_building_ids()) and can_write()) with check (building_id in (select my_building_ids()));
create policy eml_read on emergency_log for select using (emergency_id in (select id from emergencies));
create policy eml_write on emergency_log for insert with check (emergency_id in (select id from emergencies));
create policy bd_read on building_docs for select using (building_id in (select my_building_ids()));
create policy bd_write on building_docs for all using (building_id in (select my_building_ids()) and can_write()) with check (building_id in (select my_building_ids()));

-- ── integrations (org-wide admin only) ───────────────────────────────────────
create policy int_read  on integrations for select using (org_id = my_org());
create policy int_write on integrations for all using (org_id = my_org() and is_org_wide()) with check (org_id = my_org());


-- ===== seed.sql =====
-- Orbit FC — seed data. Run AFTER schema.sql + policies.sql to populate the org,
-- portfolios, buildings (with borough + association), and vendors. Deterministic
-- UUIDs so it's safe to re-run (on conflict do nothing). app_users + am_user_id /
-- portfolio leads are linked after real people sign in via Supabase Auth.

-- org
insert into orgs (id, name) values
  ('11111111-1111-1111-1111-111111111111', 'Orbit Facilities')
on conflict (id) do nothing;

-- portfolios (one book per account manager; leads linked post-signup)
insert into portfolios (id, org_id, name) values
  ('22222222-2222-2222-2222-000000000001', '11111111-1111-1111-1111-111111111111', 'Klein book — Manhattan core'),
  ('22222222-2222-2222-2222-000000000002', '11111111-1111-1111-1111-111111111111', 'Becker book — UES & Queens'),
  ('22222222-2222-2222-2222-000000000003', '11111111-1111-1111-1111-111111111111', 'Costa book — Brooklyn'),
  ('22222222-2222-2222-2222-000000000004', '11111111-1111-1111-1111-111111111111', 'Lin book — Brooklyn')
on conflict (id) do nothing;

-- buildings
insert into buildings (id, org_id, portfolio_id, code, name, address, borough, client_name, type, plan, units, lat, lng, mono, reserve, operating, delinquency, monthly_income, monthly_expense, compliance) values
  ('33333333-3333-3333-3333-0000000000b1', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-000000000001', 'ORB-001N', 'The Hawthorne', '245 W 19th St, New York, NY 10011', 'Manhattan', 'The Hawthorne Condominium', 'Condo', 'Pro', 48, 40.7428, -73.9971, '#5eead4', 1820000, 412000, 0.031, 286000, 241000, 'ok'),
  ('33333333-3333-3333-3333-0000000000b2', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-000000000001', 'ORB-002N', 'Vesper House', '88 Greenwich St, New York, NY 10006', 'Manhattan', 'Vesper House Condominium', 'Condo', 'Pro', 112, 40.7081, -74.0139, '#3b82f6', 3140000, 688000, 0.052, 512000, 447000, 'review'),
  ('33333333-3333-3333-3333-0000000000b3', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-000000000001', 'ORB-003N', 'The Calloway', '312 E 53rd St, New York, NY 10022', 'Manhattan', 'The Calloway Condominium', 'Condo', 'Pro', 86, 40.7561, -73.9686, '#a855f7', 2010000, 503000, 0.018, 398000, 352000, 'ok'),
  ('33333333-3333-3333-3333-0000000000b4', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-000000000001', 'ORB-004P', 'Marlowe Court', '540 Amsterdam Ave, New York, NY 10024', 'Manhattan', 'Marlowe Court Owners Corp', 'Co-op', 'Pro', 64, 40.7882, -73.9745, '#22c55e', 1440000, 298000, 0.074, 241000, 263000, 'alert'),
  ('33333333-3333-3333-3333-0000000000b5', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-000000000002', 'ORB-005N', 'Sutton Reach', '410 E 61st St, New York, NY 10065', 'Manhattan', 'Sutton Reach Condominium', 'Condo', 'Lite', 22, 40.7616, -73.9618, '#f59e0b', 612000, 141000, 0.009, 132000, 118000, 'ok'),
  ('33333333-3333-3333-3333-0000000000b6', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-000000000003', 'ORB-006N', 'The Ardsley', '77 Clinton St, Brooklyn, NY 11201', 'Brooklyn', 'The Ardsley Condominium', 'Condo', 'Pro', 54, 40.6906, -73.9933, '#ec4899', 1690000, 377000, 0.041, 301000, 268000, 'review'),
  ('33333333-3333-3333-3333-0000000000b7', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-000000000002', 'ORB-007H', 'Linden Park HOA', 'Linden Park, Queens, NY', 'Queens', 'Linden Park Homeowners Association', 'HOA', 'Pro', 210, 40.7038, -73.8084, '#22c55e', 4820000, 902000, 0.063, 744000, 681000, 'review'),
  ('33333333-3333-3333-3333-0000000000b8', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-000000000004', 'ORB-008B', 'The Beacon', '175 Kent Ave, Brooklyn, NY 11249', 'Brooklyn', 'The Beacon Condominium', 'Condo', 'Pro', 38, 40.7213, -73.9648, '#38bdf8', 980000, 214000, 0.027, 198000, 173000, 'ok')
on conflict (id) do nothing;

-- vendors (COI expiries relative to now so the Compliance board shows live risk)
insert into vendors (id, org_id, name, trades, phone, email, grade, rating, coi_expiry) values
  ('44444444-4444-4444-4444-000000000001', '11111111-1111-1111-1111-111111111111', 'Northeast Mechanical', '{HVAC,Boiler}', '+1 (212) 555-0301', 'dispatch@nemech.com', 94, 4.7, (now() + interval '120 days')::date),
  ('44444444-4444-4444-4444-000000000002', '11111111-1111-1111-1111-111111111111', 'Otis Elevator', '{Elevator}', '+1 (212) 555-0302', 'service@otis.example', 96, 4.8, (now() + interval '20 days')::date),
  ('44444444-4444-4444-4444-000000000003', '11111111-1111-1111-1111-111111111111', 'MetroFlow Plumbing', '{Plumbing}', '+1 (212) 555-0303', 'ops@metroflow.example', 79, 4.1, (now() - interval '6 days')::date),
  ('44444444-4444-4444-4444-000000000004', '11111111-1111-1111-1111-111111111111', 'Empire Power', '{Electrical}', '+1 (212) 555-0304', 'jobs@empirepower.example', 91, 4.6, (now() + interval '75 days')::date),
  ('44444444-4444-4444-4444-000000000005', '11111111-1111-1111-1111-111111111111', 'Skyline Restoration', '{Facade,Masonry}', '+1 (212) 555-0305', 'pm@skyline.example', 92, 4.6, (now() + interval '10 days')::date),
  ('44444444-4444-4444-4444-000000000006', '11111111-1111-1111-1111-111111111111', 'Sani Environmental', '{Pest,Sanitation}', '+1 (212) 555-0306', 'help@sani.example', 81, 4.2, (now() + interval '200 days')::date)
on conflict (id) do nothing;

-- default integration rows (matches the Integrations hub connectors)
insert into integrations (org_id, connector, connected) values
  ('11111111-1111-1111-1111-111111111111', 'gmail', true),
  ('11111111-1111-1111-1111-111111111111', 'quickbooks', true)
on conflict (org_id, connector) do nothing;
