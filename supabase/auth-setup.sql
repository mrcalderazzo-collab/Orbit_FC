-- Orbit FC — auth setup. Run once in the SQL Editor (after install.sql).
-- Creates an app_users profile automatically whenever someone signs up, linked to
-- the seeded org. First accounts come in as org-wide operators (principals) so they
-- can see the whole portfolio; you can change anyone's role later.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.app_users (id, org_id, persona, role, name, email, title, initials, color)
  values (
    new.id,
    '11111111-1111-1111-1111-111111111111',          -- the seeded "Orbit Facilities" org
    'operator', 'principal',
    coalesce(nullif(split_part(new.email, '@', 1), ''), 'New user'),
    new.email,
    'Operator',
    upper(left(coalesce(new.email, 'OR'), 2)),
    '#3b82f6'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
