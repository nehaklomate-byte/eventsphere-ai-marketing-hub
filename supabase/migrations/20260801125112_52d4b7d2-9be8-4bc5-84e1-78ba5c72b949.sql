create table if not exists public.org_departments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);
create table if not exists public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  invited_email text not null,
  full_name text,
  role_label text not null default 'Member',
  is_admin_role boolean not null default false,
  department_id uuid references public.org_departments(id) on delete set null,
  status text not null default 'invited' check (status in ('invited','active','removed','pending_confirmation')),
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
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
create or replace function public.is_org_manager(p_org_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organizations o where o.id = p_org_id and o.owner_id = p_user_id
  ) or exists (
    select 1 from public.org_members m
    where m.org_id = p_org_id and m.user_id = p_user_id
      and m.status = 'active' and m.is_admin_role = true
  );
$$;
create or replace function public.is_org_member(p_org_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_org_manager(p_org_id, p_user_id) or exists (
    select 1 from public.org_members m
    where m.org_id = p_org_id and m.user_id = p_user_id and m.status = 'active'
  );
$$;
drop policy if exists "Org managers write departments" on public.org_departments;
create policy "Org managers write departments" on public.org_departments for all to authenticated
  using (public.is_org_manager(org_id, auth.uid())) with check (public.is_org_manager(org_id, auth.uid()));
drop policy if exists "Org members read departments" on public.org_departments;
create policy "Org members read departments" on public.org_departments for select to authenticated
  using (public.is_org_member(org_id, auth.uid()));
drop policy if exists "Org managers write members" on public.org_members;
create policy "Org managers write members" on public.org_members for all to authenticated
  using (public.is_org_manager(org_id, auth.uid())) with check (public.is_org_manager(org_id, auth.uid()));
drop policy if exists "Org members read members" on public.org_members;
create policy "Org members read members" on public.org_members for select to authenticated
  using (public.is_org_member(org_id, auth.uid()) or user_id = auth.uid());
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
grant all on public.org_departments to service_role;
grant all on public.org_members to service_role;
grant all on public.org_events to service_role;
create table if not exists public.org_roles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  permissions jsonb not null default '[]'::jsonb,
  is_admin_role boolean not null default false,
  is_default boolean not null default false,
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
drop policy if exists "Anyone can read a role by being invited" on public.org_roles;
create policy "Anyone can read a role by being invited" on public.org_roles for select to authenticated
  using (id in (select role_id from public.org_members where invite_token is not null));
drop policy if exists "Invited user reads own invite by token" on public.org_members;
create policy "Invited user reads own invite by token" on public.org_members for select to authenticated
  using (true);
drop policy if exists "Invited user claims own membership" on public.org_members;
create policy "Invited user claims own membership" on public.org_members for update to authenticated
  using (invite_token is not null and status in ('invited','pending_confirmation'))
  with check (user_id = auth.uid() and status in ('active','pending_confirmation'));
grant select, insert, update, delete on public.org_roles to authenticated;
grant all on public.org_roles to service_role;
create or replace function public.org_member_has_permission(p_org_id uuid, p_user_id uuid, p_permission text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_org_manager(p_org_id, p_user_id) or exists (
    select 1 from public.org_members m
    join public.org_roles r on r.id = m.role_id
    where m.org_id = p_org_id and m.user_id = p_user_id and m.status = 'active'
      and (r.is_admin_role = true or r.permissions ? p_permission)
  );
$$;
insert into public.org_roles (org_id, name, description, permissions, is_admin_role, is_default)
select id, 'Member', 'Default role with no special permissions', '[]'::jsonb, false, true
from public.organizations o
where not exists (select 1 from public.org_roles r where r.org_id = o.id and r.is_default = true);