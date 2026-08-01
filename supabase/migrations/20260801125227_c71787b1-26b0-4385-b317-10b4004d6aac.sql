create table if not exists public.org_event_forms (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.org_events(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  team_mode text not null default 'solo' check (team_mode in ('solo','team','both')),
  min_team_size integer not null default 1,
  max_team_size integer not null default 1,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.org_event_form_fields (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.org_event_forms(id) on delete cascade,
  label text not null,
  field_type text not null default 'text' check (field_type in (
    'text','email','phone','textarea','number','date','dropdown','checkbox','radio',
    'upload','url','rating'
  )),
  placeholder text,
  options jsonb not null default '[]'::jsonb,
  is_required boolean not null default false,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.org_event_forms enable row level security;
alter table public.org_event_form_fields enable row level security;
drop policy if exists "Org managers write forms" on public.org_event_forms;
create policy "Org managers write forms" on public.org_event_forms for all to authenticated
  using (public.is_org_manager(org_id, auth.uid())) with check (public.is_org_manager(org_id, auth.uid()));
drop policy if exists "Org members read forms" on public.org_event_forms;
create policy "Org members read forms" on public.org_event_forms for select to authenticated
  using (public.is_org_member(org_id, auth.uid()));
drop policy if exists "Public reads published forms" on public.org_event_forms;
create policy "Public reads published forms" on public.org_event_forms for select to anon
  using (is_published = true);
drop policy if exists "Authenticated reads published forms" on public.org_event_forms;
create policy "Authenticated reads published forms" on public.org_event_forms for select to authenticated
  using (is_published = true);
drop policy if exists "Org managers write fields" on public.org_event_form_fields;
create policy "Org managers write fields" on public.org_event_form_fields for all to authenticated
  using (exists (select 1 from public.org_event_forms f where f.id = form_id and public.is_org_manager(f.org_id, auth.uid())))
  with check (exists (select 1 from public.org_event_forms f where f.id = form_id and public.is_org_manager(f.org_id, auth.uid())));
drop policy if exists "Org members read fields" on public.org_event_form_fields;
create policy "Org members read fields" on public.org_event_form_fields for select to authenticated
  using (exists (select 1 from public.org_event_forms f where f.id = form_id and public.is_org_member(f.org_id, auth.uid())));
drop policy if exists "Public reads fields of published forms" on public.org_event_form_fields;
create policy "Public reads fields of published forms" on public.org_event_form_fields for select to anon
  using (exists (select 1 from public.org_event_forms f where f.id = form_id and f.is_published = true));
drop policy if exists "Authenticated reads fields of published forms" on public.org_event_form_fields;
create policy "Authenticated reads fields of published forms" on public.org_event_form_fields for select to authenticated
  using (exists (select 1 from public.org_event_forms f where f.id = form_id and f.is_published = true));
grant select, insert, update, delete on public.org_event_forms to authenticated;
grant select on public.org_event_forms to anon;
grant all on public.org_event_forms to service_role;
grant select, insert, update, delete on public.org_event_form_fields to authenticated;
grant select on public.org_event_form_fields to anon;
grant all on public.org_event_form_fields to service_role;
alter table public.worker_tasks
  add column if not exists check_in_at timestamptz,
  add column if not exists check_in_photo_url text,
  add column if not exists check_in_lat numeric,
  add column if not exists check_in_lng numeric,
  add column if not exists check_out_at timestamptz,
  add column if not exists check_out_photo_url text,
  add column if not exists check_out_lat numeric,
  add column if not exists check_out_lng numeric,
  add column if not exists completion_photo_urls jsonb not null default '[]'::jsonb,
  add column if not exists completion_notes text;
create or replace function public.tg_worker_task_attendance_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status = 'in_progress' and old.status is distinct from 'in_progress' and old.check_in_at is null then
    if new.check_in_photo_url is null or length(trim(new.check_in_photo_url)) = 0 then
      raise exception 'A check-in photo is required before starting work.';
    end if;
    if new.check_in_at is null then
      new.check_in_at := now();
    end if;
  end if;
  if new.status = 'completed' and old.status is distinct from 'completed' then
    if new.check_out_photo_url is null or length(trim(new.check_out_photo_url)) = 0 then
      raise exception 'A check-out photo is required to complete this task.';
    end if;
    if coalesce(jsonb_array_length(new.completion_photo_urls), 0) < 1 then
      raise exception 'At least one work-proof photo is required to complete this task.';
    end if;
    if new.check_out_at is null then
      new.check_out_at := now();
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists worker_task_attendance_guard on public.worker_tasks;
create trigger worker_task_attendance_guard before update on public.worker_tasks
  for each row execute function public.tg_worker_task_attendance_guard();
drop policy if exists "Invited user reads own invite by token" on public.org_members;
create policy "Invited user reads own invite by token" on public.org_members for select to anon, authenticated
  using (true);
drop policy if exists "Anyone can read a role by being invited" on public.org_roles;
create policy "Anyone can read a role by being invited" on public.org_roles for select to anon, authenticated
  using (id in (select role_id from public.org_members where invite_token is not null));
drop policy if exists "Anyone reads org name for invite screen" on public.organizations;
create policy "Anyone reads org name for invite screen" on public.organizations for select to anon, authenticated
  using (id in (select org_id from public.org_members where invite_token is not null));
grant select on public.org_members to anon;
grant select on public.org_roles to anon;
grant select on public.organizations to anon;