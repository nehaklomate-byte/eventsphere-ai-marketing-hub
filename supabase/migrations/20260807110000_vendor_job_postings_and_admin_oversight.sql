-- ============================================================
-- 1) Vendors can now post worker jobs too (Organizations and Venue
--    Owners already could — see 20260728100000_worker_job_marketplace.sql
--    and 20260807090000_venue_job_postings.sql). vendor_id already
--    existed as a column, it just had no real RLS behind it.
--
-- 2) SECURITY FIX found during audit: the original insert policy was
--       posted_by = auth.uid()
--       and (org_id is null or org_member_has_permission(...))
--    Notice it never checked vendor_id ownership — if org_id and
--    hall_id were left null, ANY authenticated user could insert a
--    posting tagged with someone else's vendor_id. This migration
--    replaces that policy with one that checks all three poster types.
--
-- 3) Admin oversight: admin can now read + close/cancel ANY posting
--    and see ALL applications, regardless of who posted them or who
--    applied — for the "admin ला सगळं दिसू दे" requirement. Admin is
--    NOT required to approve a posting before it goes live (see the
--    chat explanation for the reasoning) — this migration gives
--    visibility + after-the-fact moderation, not a pre-publish gate.
--    If a hard approval gate is wanted later, add a `status =
--    'pending_review'` default + a separate admin-only transition —
--    that is a bigger change, deliberately not included here.
-- ============================================================

drop policy if exists "Anyone can browse open postings" on public.worker_job_postings;
create policy "Anyone can browse open postings" on public.worker_job_postings
  for select to authenticated using (
    status = 'open'
    or (org_id is not null and public.is_org_member(org_id, auth.uid()))
    or (hall_id is not null and exists (select 1 from public.halls h where h.id = hall_id and h.owner_id = auth.uid()))
    or (vendor_id is not null and exists (select 1 from public.vendors v where v.id = vendor_id and v.owner_id = auth.uid()))
    or public.has_role(auth.uid(), 'admin')
  );

drop policy if exists "Hiring managers create postings" on public.worker_job_postings;
create policy "Hiring managers create postings" on public.worker_job_postings
  for insert to authenticated with check (
    posted_by = auth.uid()
    and (org_id is null or public.org_member_has_permission(org_id, auth.uid(), 'hire_workers'))
    and (hall_id is null or exists (select 1 from public.halls h where h.id = hall_id and h.owner_id = auth.uid()))
    and (vendor_id is null or exists (select 1 from public.vendors v where v.id = vendor_id and v.owner_id = auth.uid()))
  );

drop policy if exists "Hiring managers update postings" on public.worker_job_postings;
create policy "Hiring managers update postings" on public.worker_job_postings
  for update to authenticated using (
    (org_id is not null and public.org_member_has_permission(org_id, auth.uid(), 'hire_workers'))
    or (hall_id is not null and exists (select 1 from public.halls h where h.id = hall_id and h.owner_id = auth.uid()))
    or (vendor_id is not null and exists (select 1 from public.vendors v where v.id = vendor_id and v.owner_id = auth.uid()))
    or public.has_role(auth.uid(), 'admin')
  );

drop policy if exists "Hiring managers delete postings" on public.worker_job_postings;
create policy "Hiring managers delete postings" on public.worker_job_postings
  for delete to authenticated using (
    (org_id is not null and public.org_member_has_permission(org_id, auth.uid(), 'hire_workers'))
    or (hall_id is not null and exists (select 1 from public.halls h where h.id = hall_id and h.owner_id = auth.uid()))
    or (vendor_id is not null and exists (select 1 from public.vendors v where v.id = vendor_id and v.owner_id = auth.uid()))
    or public.has_role(auth.uid(), 'admin')
  );

-- ---------- applications: same three-way ownership check + admin ----------
drop policy if exists "Poster reads applications to own postings" on public.worker_job_applications;
create policy "Poster reads applications to own postings" on public.worker_job_applications
  for select to authenticated using (
    exists (
      select 1 from public.worker_job_postings p
      where p.id = posting_id
        and (
          (p.org_id is not null and public.is_org_member(p.org_id, auth.uid()))
          or (p.hall_id is not null and exists (select 1 from public.halls h where h.id = p.hall_id and h.owner_id = auth.uid()))
          or (p.vendor_id is not null and exists (select 1 from public.vendors v where v.id = p.vendor_id and v.owner_id = auth.uid()))
        )
    )
    or public.has_role(auth.uid(), 'admin')
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
          or (p.vendor_id is not null and exists (select 1 from public.vendors v where v.id = p.vendor_id and v.owner_id = auth.uid()))
        )
    )
    or public.has_role(auth.uid(), 'admin')
  );

-- ---------- accept_worker_application: also resolve vendor business name ----------
create or replace function public.accept_worker_application(p_application_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_app public.worker_job_applications%rowtype;
  v_posting public.worker_job_postings%rowtype;
  v_poster_name text;
  v_task_id uuid;
  v_allowed boolean;
begin
  select * into v_app from public.worker_job_applications where id = p_application_id;
  if v_app.id is null then raise exception 'Application not found.'; end if;

  select * into v_posting from public.worker_job_postings where id = v_app.posting_id;
  if v_posting.id is null then raise exception 'Posting not found.'; end if;

  v_allowed := (v_posting.org_id is not null and public.org_member_has_permission(v_posting.org_id, auth.uid(), 'hire_workers'))
    or (v_posting.hall_id is not null and exists (select 1 from public.halls h where h.id = v_posting.hall_id and h.owner_id = auth.uid()))
    or (v_posting.vendor_id is not null and exists (select 1 from public.vendors v where v.id = v_posting.vendor_id and v.owner_id = auth.uid()))
    or public.has_role(auth.uid(), 'admin');
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
    select name into v_poster_name from public.organizations where id = v_posting.org_id;
  elsif v_posting.hall_id is not null then
    select name into v_poster_name from public.halls where id = v_posting.hall_id;
  elsif v_posting.vendor_id is not null then
    select business_name into v_poster_name from public.vendors where id = v_posting.vendor_id;
  end if;

  insert into public.worker_tasks (
    worker_id, worker_user_id, assigned_by, organization_id, organization_name,
    event_name, task_name, description, venue, venue_address, event_date,
    start_time, end_time, priority, status, payment_amount
  ) values (
    v_app.worker_id, v_app.worker_user_id, auth.uid(), v_posting.org_id, v_poster_name,
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
