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
