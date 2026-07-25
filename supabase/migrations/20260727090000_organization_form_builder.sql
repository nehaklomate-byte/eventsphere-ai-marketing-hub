-- ============================================================
-- Organization Module — Phase 3 (Layer 3): Dynamic Registration Form Builder
--
-- One form per event (org_event_forms), with an ordered list of fully
-- custom fields (org_event_form_fields). field_type is a fixed platform
-- list (see FIELD_TYPES in src/lib/organization.ts) but WHICH fields, in
-- WHAT order, with WHAT options/labels is 100% configurable per event.
--
-- Phase 4 (next): org_event_registrations — the actual participant/team
-- submissions against these fields, using this form as the schema.
-- ============================================================

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
  options jsonb not null default '[]'::jsonb, -- for dropdown/checkbox/radio: array of strings
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
grant select, insert, update, delete on public.org_event_form_fields to authenticated;
grant select on public.org_event_form_fields to anon;
