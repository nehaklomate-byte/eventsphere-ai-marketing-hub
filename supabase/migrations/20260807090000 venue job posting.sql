-- ============================================================
-- Venue Owners can now post worker jobs too (previously only
-- Organizations could — see 20260728100000_worker_job_marketplace.sql).
--
-- IMPORTANT — schema-conflict note found during audit:
-- Migration 20260802110156_...sql also tried to (re)create
-- public.worker_job_postings with a DIFFERENT shape (created_by
-- instead of posted_by, a hall_id column already, and a wide-open
-- "any authenticated user can post" policy). Because
-- 20260728100000 runs first and already creates the table, that
-- later migration's `CREATE TABLE IF NOT EXISTS` was a silent
-- no-op on the table itself — but its DROP/CREATE POLICY
-- statements referencing the non-existent `created_by` column
-- would have errored when applied. src/lib/organization.ts (the
-- code actually wired to the UI) inserts `posted_by`, confirming
-- 20260728100000's shape is the one really in use. This migration
-- builds on THAT shape. If your Supabase migration history shows
-- 20260802110156 failed to apply, that's expected and fine — do
-- not re-run it as-is, it will conflict with this one.
-- ============================================================

alter table public.worker_job_postings add column if not exists hall_id uuid references public.halls(id) on delete cascade;

-- Old constraint only allowed org_id or vendor_id — widen it to allow hall_id too.
alter table public.worker_job_postings drop constraint if exists worker_job_postings_check;
alter table public.worker_job_postings add constraint worker_job_postings_check
  check (org_id is not null or vendor_id is not null or hall_id is not null);

create index if not exists worker_job_postings_hall_idx on public.worker_job_postings(hall_id);

-- ---------- RLS: browsing still open to everyone (unchanged), add hall owner read/write ----------
drop policy if exists "Anyone can browse open postings" on public.worker_job_postings;
create policy "Anyone can browse open postings" on public.worker_job_postings
  for select to authenticated using (
    status = 'open'
    or (org_id is not null and public.is_org_member(org_id, auth.uid()))
    or (hall_id is not null and exists (select 1 from public.halls h where h.id = hall_id and h.owner_id = auth.uid()))
  );

drop policy if exists "Hiring managers create postings" on public.worker_job_postings;
create policy "Hiring managers create postings" on public.worker_job_postings
  for insert to authenticated with check (
    posted_by = auth.uid()
    and (
      (org_id is null or public.org_member_has_permission(org_id, auth.uid(), 'hire_workers'))
      and (hall_id is null or exists (select 1 from public.halls h where h.id = hall_id and h.owner_id = auth.uid()))
    )
  );

drop policy if exists "Hiring managers update postings" on public.worker_job_postings;
create policy "Hiring managers update postings" on public.worker_job_postings
  for update to authenticated using (
    (org_id is not null and public.org_member_has_permission(org_id, auth.uid(), 'hire_workers'))
    or (hall_id is not null and exists (select 1 from public.halls h where h.id = hall_id and h.owner_id = auth.uid()))
  );

drop policy if exists "Hiring managers delete postings" on public.worker_job_postings;
create policy "Hiring managers delete postings" on public.worker_job_postings
  for delete to authenticated using (
    (org_id is not null and public.org_member_has_permission(org_id, auth.uid(), 'hire_workers'))
    or (hall_id is not null and exists (select 1 from public.halls h where h.id = hall_id and h.owner_id = auth.uid()))
  );

-- ---------- RLS: applications — venue owner can now also see/manage applicants to their own postings ----------
drop policy if exists "Poster reads applications to own postings" on public.worker_job_applications;
create policy "Poster reads applications to own postings" on public.worker_job_applications
  for select to authenticated using (
    exists (
      select 1 from public.worker_job_postings p
      where p.id = posting_id
        and (
          (p.org_id is not null and public.is_org_member(p.org_id, auth.uid()))
          or (p.hall_id is not null and exists (select 1 from public.halls h where h.id = p.hall_id and h.owner_id = auth.uid()))
        )
    )
  );

drop policy if exists "Poster updates applications to own postings" on public.worker_job_applications;
create policy "Poster updates applications to own postings" on public.worker_job_applications
  for update to authenticated using (
    exists (
      select 1 from public.worker_job_postings p
      where p.id = posting_id
        and (
          (p.org_id is not null and public.org_member_has_permission(p.org_id, auth.uid(), 'hire_workers'))
          or (p.hall_id is not null and exists (select 1 from public.halls h where h.id = p.hall_id and h.owner_id = auth.uid()))
        )
    )
  );

-- ---------- accept_worker_application: teach it about hall-owned postings ----------
create or replace function public.accept_worker_application(p_application_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_app public.worker_job_applications%rowtype;
  v_posting public.worker_job_postings%rowtype;
  v_org_name text;
  v_hall_name text;
  v_task_id uuid;
  v_allowed boolean;
begin
  select * into v_app from public.worker_job_applications where id = p_application_id;
  if v_app.id is null then raise exception 'Application not found.'; end if;

  select * into v_posting from public.worker_job_postings where id = v_app.posting_id;
  if v_posting.id is null then raise exception 'Posting not found.'; end if;

  v_allowed := (v_posting.org_id is not null and public.org_member_has_permission(v_posting.org_id, auth.uid(), 'hire_workers'))
    or (v_posting.hall_id is not null and exists (select 1 from public.halls h where h.id = v_posting.hall_id and h.owner_id = auth.uid()));
  if not v_allowed then
    raise exception 'You do not have permission to hire for this posting.';
  end if;

  if v_app.status = 'accepted' then
    raise exception 'This application has already been accepted.';
  end if;

  if v_posting.slots_filled >= v_posting.slots_needed then
    raise exception 'All slots for this posting are already filled.';
  end if;

  if v_posting.org_id is not null then
    select name into v_org_name from public.organizations where id = v_posting.org_id;
  elsif v_posting.hall_id is not null then
    select name into v_hall_name from public.halls where id = v_posting.hall_id;
  end if;

  insert into public.worker_tasks (
    worker_id, worker_user_id, assigned_by, organization_id, organization_name,
    event_name, task_name, description, venue, venue_address, event_date,
    start_time, end_time, priority, status, payment_amount
  ) values (
    v_app.worker_id, v_app.worker_user_id, auth.uid(), v_posting.org_id, coalesce(v_org_name, v_hall_name),
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
