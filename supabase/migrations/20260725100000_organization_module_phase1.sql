-- ============================================================
-- Organization Module — Phase 1
-- Scalable team structure: departments + members (flexible role_label,
-- NOT a fixed enum — so an org/admin can invent new roles like "Judge",
-- "Sponsorship Lead", "Volunteer Coordinator" without a new migration
-- every time) + org-scoped events.
--
-- Phase 2 (next): org_event_registrations (participants/teams),
-- org_event_sponsors, org_event_scores (leaderboard), certificates.
-- ============================================================

-- 1. Departments — org-defined groupings (Technical, Cultural, Sponsorship,
--    Hospitality, etc.). Fully custom per organization.
create table if not exists public.org_departments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

-- 2. Members — the org's internal team. role_label is free text on
--    purpose (scalability requirement): the org owner (or admin) can type
--    any role name. is_admin_role marks who gets full org-management
--    rights (equivalent to "org owner/admin" inside their own org);
--    everyone else is scoped by permissions in a later phase if needed.
create table if not exists public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  invited_email text not null,
  full_name text,
  role_label text not null default 'Member',
  is_admin_role boolean not null default false,
  department_id uuid references public.org_departments(id) on delete set null,
  status text not null default 'invited' check (status in ('invited','active','removed')),
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- The organization's own owner (from `organizations.owner_id`) is always
-- treated as an implicit admin-role member — no row required for them.

-- 3. Org-scoped events (hackathons, fests, seminars, competitions, CSR
--    drives, corporate offsites — event_type is free text for the same
--    scalability reason as role_label).
create table if not exists public.org_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  event_type text not null default 'General',
  description text,
  mode text not null default 'offline' check (mode in ('online','offline','hybrid')),
  venue_hall_id uuid references public.halls(id) on delete set null,
  custom_location text,
  start_at timestamptz,
  end_at timestamptz,
  registration_deadline timestamptz,
  max_participants integer,
  status text not null default 'draft' check (status in ('draft','published','ongoing','completed','cancelled')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.org_departments enable row level security;
alter table public.org_members enable row level security;
alter table public.org_events enable row level security;

-- Helper: is this user the owner or an active admin-role member of this org?
create or replace function public.is_org_manager(p_org_id uuid, p_user_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.organizations o where o.id = p_org_id and o.owner_id = p_user_id
  ) or exists (
    select 1 from public.org_members m
    where m.org_id = p_org_id and m.user_id = p_user_id
      and m.status = 'active' and m.is_admin_role = true
  );
$$;

-- Helper: is this user ANY active member of this org (read access)?
create or replace function public.is_org_member(p_org_id uuid, p_user_id uuid)
returns boolean language sql stable as $$
  select public.is_org_manager(p_org_id, p_user_id) or exists (
    select 1 from public.org_members m
    where m.org_id = p_org_id and m.user_id = p_user_id and m.status = 'active'
  );
$$;

-- Departments: managers can write, any active member can read.
drop policy if exists "Org managers write departments" on public.org_departments;
create policy "Org managers write departments" on public.org_departments for all to authenticated
  using (public.is_org_manager(org_id, auth.uid())) with check (public.is_org_manager(org_id, auth.uid()));
drop policy if exists "Org members read departments" on public.org_departments;
create policy "Org members read departments" on public.org_departments for select to authenticated
  using (public.is_org_member(org_id, auth.uid()));

-- Members: managers can write (invite/remove/change role); a member can
-- read their own org's member list; a user can always see their own row.
drop policy if exists "Org managers write members" on public.org_members;
create policy "Org managers write members" on public.org_members for all to authenticated
  using (public.is_org_manager(org_id, auth.uid())) with check (public.is_org_manager(org_id, auth.uid()));
drop policy if exists "Org members read members" on public.org_members;
create policy "Org members read members" on public.org_members for select to authenticated
  using (public.is_org_member(org_id, auth.uid()) or user_id = auth.uid());

-- Events: managers write; any active member reads; published events are
-- publicly readable (for the future public event page / registration).
drop policy if exists "Org managers write events" on public.org_events;
create policy "Org managers write events" on public.org_events for all to authenticated
  using (public.is_org_manager(org_id, auth.uid())) with check (public.is_org_manager(org_id, auth.uid()));
drop policy if exists "Org members read events" on public.org_events;
create policy "Org members read events" on public.org_events for select to authenticated
  using (public.is_org_member(org_id, auth.uid()));
drop policy if exists "Public reads published events" on public.org_events;
create policy "Public reads published events" on public.org_events for select to anon
  using (status = 'published');

grant select, insert, update, delete on public.org_departments to authenticated;
grant select, insert, update, delete on public.org_members to authenticated;
grant select, insert, update, delete on public.org_events to authenticated;
grant select on public.org_events to anon;
