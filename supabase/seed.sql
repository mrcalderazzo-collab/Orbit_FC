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
