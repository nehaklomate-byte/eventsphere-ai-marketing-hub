-- ============================================================
-- Worker Job Marketplace (open postings + applications)
--
-- Bridges two already-built modules without touching either's existing
-- tables: Organization side (org_events, org_members, org_roles,
-- org_member_has_permission) posts jobs; Worker side (workers,
-- worker_tasks) browses/applies. Accepting an application creates a row
-- in the EXISTING public.worker_tasks table, so everything already built
-- there (accept/reject, check-in/check-out, mandatory photo-proof) just
-- works automatically — no duplicate task-tracking logic.
--
-- vendor_id is included (nullable) so the same marketplace can be wired
-- up for the Vendor module later without another migration.
-- ============================================================

create table if not exists public.worker_job_postings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete cascade,
  event_id uuid references public.org_events(id) on delete set null,
  posted_by uuid not null references auth.users(id) on delete restrict,
  title text not null,
  category text not null,
  description text,
  venue text,
  venue_address text,
  event_date date not null,
  start_time time,
  end_time time,
  slots_needed int not null default 1 check (slots_needed > 0),
  slots_filled int not null default 0 check (slots_filled >= 0),
  pay_amount numeric(10,2),
  pay_type text not null default 'per_event' check (pay_type in ('hourly','daily','per_event')),
  status text not null default 'open' check (status in ('open','closed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (org_id is not null or vendor_id is not null)
);
grant select, insert, update, delete on public.worker_job_postings to authenticated;
grant all on public.worker_job_postings to service_role;
alter table public.worker_job_postings enable row level security;

create table if not exists public.worker_job_applications (
  id uuid primary key default gen_random_uuid(),
  posting_id uuid not null references public.worker_job_postings(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  worker_user_id uuid not null references auth.users(id) on delete cascade,
  cover_note text,
  status text not null default 'applied' check (status in ('applied','shortlisted','accepted','rejected','withdrawn')),
  applied_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (posting_id, worker_id)
);
grant select, insert, update, delete on public.worker_job_applications to authenticated;
grant all on public.worker_job_applications to service_role;
alter table public.worker_job_applications enable row level security;

create index if not exists worker_job_postings_org_idx on public.worker_job_postings(org_id);
create index if not exists worker_job_postings_status_idx on public.worker_job_postings(status);
create index if not exists worker_job_applications_posting_idx on public.worker_job_applications(posting_id);
create index if not exists worker_job_applications_worker_idx on public.worker_job_applications(worker_user_id);

create trigger worker_job_postings_updated_at before update on public.worker_job_postings
  for each row execute function public.tg_set_updated_at();

-- ---------- RLS: postings ----------
-- Any authenticated worker can browse OPEN postings (the public board).
-- Org/vendor staff can always see their own postings regardless of status.
drop policy if exists "Anyone can browse open postings" on public.worker_job_postings;
create policy "Anyone can browse open postings" on public.worker_job_postings
  for select to authenticated using (
    status = 'open'
    or (org_id is not null and public.is_org_member(org_id, auth.uid()))
  );

drop policy if exists "Hiring managers create postings" on public.worker_job_postings;
create policy "Hiring managers create postings" on public.worker_job_postings
  for insert to authenticated with check (
    posted_by = auth.uid()
    and (org_id is null or public.org_member_has_permission(org_id, auth.uid(), 'hire_workers'))
  );

drop policy if exists "Hiring managers update postings" on public.worker_job_postings;
create policy "Hiring managers update postings" on public.worker_job_postings
  for update to authenticated using (
    org_id is not null and public.org_member_has_permission(org_id, auth.uid(), 'hire_workers')
  );

drop policy if exists "Hiring managers delete postings" on public.worker_job_postings;
create policy "Hiring managers delete postings" on public.worker_job_postings
  for delete to authenticated using (
    org_id is not null and public.org_member_has_permission(org_id, auth.uid(), 'hire_workers')
  );

-- ---------- RLS: applications ----------
drop policy if exists "Worker reads own applications" on public.worker_job_applications;
create policy "Worker reads own applications" on public.worker_job_applications
  for select to authenticated using (worker_user_id = auth.uid());

drop policy if exists "Poster reads applications to own postings" on public.worker_job_applications;
create policy "Poster reads applications to own postings" on public.worker_job_applications
  for select to authenticated using (
    exists (
      select 1 from public.worker_job_postings p
      where p.id = posting_id and p.org_id is not null and public.is_org_member(p.org_id, auth.uid())
    )
  );

drop policy if exists "Worker applies for self" on public.worker_job_applications;
create policy "Worker applies for self" on public.worker_job_applications
  for insert to authenticated with check (worker_user_id = auth.uid());

drop policy if exists "Worker withdraws own application" on public.worker_job_applications;
create policy "Worker withdraws own application" on public.worker_job_applications
  for update to authenticated using (worker_user_id = auth.uid());

drop policy if exists "Poster updates applications to own postings" on public.worker_job_applications;
create policy "Poster updates applications to own postings" on public.worker_job_applications
  for update to authenticated using (
    exists (
      select 1 from public.worker_job_postings p
      where p.id = posting_id and p.org_id is not null and public.org_member_has_permission(p.org_id, auth.uid(), 'hire_workers')
    )
  );

-- A worker may only ever set their OWN application to 'withdrawn' — never
-- shortlist/accept/reject themselves, even though the permissive policy
-- above would otherwise let the row through.
create or replace function public.tg_guard_application_self_update()
returns trigger language plpgsql as $$
begin
  if old.worker_user_id = auth.uid() and new.status not in ('withdrawn') and new.status is distinct from old.status then
    raise exception 'You can only withdraw your own application — hiring decisions are made by the organization.';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_application_self_update on public.worker_job_applications;
create trigger guard_application_self_update before update on public.worker_job_applications
  for each row execute function public.tg_guard_application_self_update();

-- ---------- Accept application: atomically creates the worker_task ----------
-- security definer because it inserts into worker_tasks on behalf of the
-- hiring org — permission is checked explicitly inside, so this can't be
-- used to bypass anything the RLS above wouldn't already allow directly.
create or replace function public.accept_worker_application(p_application_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_app public.worker_job_applications%rowtype;
  v_posting public.worker_job_postings%rowtype;
  v_org_name text;
  v_task_id uuid;
begin
  select * into v_app from public.worker_job_applications where id = p_application_id;
  if v_app.id is null then raise exception 'Application not found.'; end if;

  select * into v_posting from public.worker_job_postings where id = v_app.posting_id;
  if v_posting.id is null then raise exception 'Posting not found.'; end if;

  if v_posting.org_id is null or not public.org_member_has_permission(v_posting.org_id, auth.uid(), 'hire_workers') then
    raise exception 'You do not have permission to hire for this posting.';
  end if;

  if v_app.status = 'accepted' then
    raise exception 'This application has already been accepted.';
  end if;

  if v_posting.slots_filled >= v_posting.slots_needed then
    raise exception 'All slots for this posting are already filled.';
  end if;

  select name into v_org_name from public.organizations where id = v_posting.org_id;

  insert into public.worker_tasks (
    worker_id, worker_user_id, assigned_by, organization_id, organization_name,
    event_name, task_name, description, venue, venue_address, event_date,
    start_time, end_time, priority, status, payment_amount
  ) values (
    v_app.worker_id, v_app.worker_user_id, auth.uid(), v_posting.org_id, v_org_name,
    v_posting.title, v_posting.title, v_posting.description, v_posting.venue, v_posting.venue_address, v_posting.event_date,
    v_posting.start_time, v_posting.end_time, 'normal', 'pending', v_posting.pay_amount
  ) returning id into v_task_id;

  update public.worker_job_applications set status = 'accepted', responded_at = now() where id = p_application_id;
  update public.worker_job_postings set
    slots_filled = slots_filled + 1,
    status = case when slots_filled + 1 >= slots_needed then 'closed' else status end
  where id = v_posting.id;

  return v_task_id;
end;
$$;

grant execute on function public.accept_worker_application(uuid) to authenticated;
