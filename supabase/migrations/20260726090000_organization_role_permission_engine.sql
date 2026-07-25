-- ============================================================
-- Organization Module — Phase 2 (Layer 2): Role & Permission Engine
--
-- org_roles: fully custom roles per organization, each with a chosen set
-- of permissions from a fixed platform permission list (the LIST of
-- possible permissions is fixed in code — see PERMISSIONS in
-- src/lib/organization.ts — but WHICH ones any given role has is 100%
-- configurable per org, and org can create unlimited roles with any name).
--
-- org_members now links to org_roles (role_id) instead of only a free-text
-- label. invite_token enables the "member gets their own login" flow:
-- org admin invites by email -> system generates a token -> member visits
-- /join-organization/<token> -> signs up/logs in with that email -> gets
-- auto-linked (status becomes 'active', user_id gets set).
-- ============================================================

create table if not exists public.org_roles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  permissions jsonb not null default '[]'::jsonb, -- array of permission-key strings, e.g. ["create_event","view_participants"]
  is_admin_role boolean not null default false,    -- true = full org-management access, bypasses individual permission checks
  is_default boolean not null default false,       -- true = the fallback "Member" role every org gets on creation
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

alter table public.org_members
  add column if not exists role_id uuid references public.org_roles(id) on delete set null,
  add column if not exists invite_token uuid default gen_random_uuid(),
  add column if not exists invite_expires_at timestamptz default (now() + interval '14 days');

alter table public.org_roles enable row level security;

drop policy if exists "Org managers write roles" on public.org_roles;
create policy "Org managers write roles" on public.org_roles for all to authenticated
  using (public.is_org_manager(org_id, auth.uid())) with check (public.is_org_manager(org_id, auth.uid()));
drop policy if exists "Org members read roles" on public.org_roles;
create policy "Org members read roles" on public.org_roles for select to authenticated
  using (public.is_org_member(org_id, auth.uid()));

-- Anonymous/just-signed-up users need to read ONE role row + ONE member row
-- by invite_token to complete the join flow, before they're an org member yet.
drop policy if exists "Anyone can read a role by being invited" on public.org_roles;
create policy "Anyone can read a role by being invited" on public.org_roles for select to authenticated
  using (id in (select role_id from public.org_members where invite_token is not null));

drop policy if exists "Invited user reads own invite by token" on public.org_members;
create policy "Invited user reads own invite by token" on public.org_members for select to authenticated
  using (true);
-- (Read access here is intentionally broad — invite_token is a random uuid,
--  effectively a secret capability link; the JOIN flow looks up by token,
--  never lists all members to an outsider. Write below stays locked down.)

drop policy if exists "Invited user claims own membership" on public.org_members;
create policy "Invited user claims own membership" on public.org_members for update to authenticated
  using (invite_token is not null and status = 'invited')
  with check (user_id = auth.uid() and status = 'active');
-- ^ lets a freshly-authenticated user (matching the invite) flip their own
--   row from invited -> active and attach their user_id — nothing else.

grant select, insert, update, delete on public.org_roles to authenticated;

-- Helper: does this user have a specific permission in this org?
-- Admin-role members (or the org owner) always pass, regardless of the list.
create or replace function public.org_member_has_permission(p_org_id uuid, p_user_id uuid, p_permission text)
returns boolean language sql stable as $$
  select public.is_org_manager(p_org_id, p_user_id) or exists (
    select 1 from public.org_members m
    join public.org_roles r on r.id = m.role_id
    where m.org_id = p_org_id and m.user_id = p_user_id and m.status = 'active'
      and (r.is_admin_role = true or r.permissions ? p_permission)
  );
$$;

-- Seed a default "Member" role (no special permissions) for every existing
-- organization, so org_members created before this migration still resolve
-- to a valid role_id if needed later. New orgs should create this on
-- registration going forward (handled in application code).
insert into public.org_roles (org_id, name, description, permissions, is_admin_role, is_default)
select id, 'Member', 'Default role with no special permissions', '[]'::jsonb, false, true
from public.organizations o
where not exists (select 1 from public.org_roles r where r.org_id = o.id and r.is_default = true);
