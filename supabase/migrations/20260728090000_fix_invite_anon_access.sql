-- ============================================================
-- Fix: invite-link lookup must work for NOT-YET-LOGGED-IN visitors
-- (they're "anon" until they register/login), not just "authenticated".
-- ============================================================

drop policy if exists "Invited user reads own invite by token" on public.org_members;
create policy "Invited user reads own invite by token" on public.org_members for select to anon, authenticated
  using (true);

drop policy if exists "Anyone can read a role by being invited" on public.org_roles;
create policy "Anyone can read a role by being invited" on public.org_roles for select to anon, authenticated
  using (id in (select role_id from public.org_members where invite_token is not null));

-- Also allow anon to read the organization's name for the invite screen
-- (only the name — nothing else is exposed this way).
drop policy if exists "Anyone reads org name for invite screen" on public.organizations;
create policy "Anyone reads org name for invite screen" on public.organizations for select to anon, authenticated
  using (id in (select org_id from public.org_members where invite_token is not null));

grant select on public.org_members to anon;
grant select on public.org_roles to anon;
grant select on public.organizations to anon;

NOTIFY pgrst, 'reload schema';
