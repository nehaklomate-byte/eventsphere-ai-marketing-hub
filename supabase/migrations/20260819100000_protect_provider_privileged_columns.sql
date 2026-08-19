-- ============================================================
-- BUG: "Official Booking Profile" badge (and other paid/admin-only
-- flags) could be self-granted by a listing's own owner.
--
-- Root cause: "Owner updates halls/vendors/workers" RLS policies only
-- have a USING clause (owner_id = auth.uid()) and no WITH CHECK, and
-- Postgres RLS is row-level, not column-level — so once an owner is
-- allowed to update their own row at all, they can set ANY column on
-- it, including ones that are only supposed to move after a real,
-- server-verified event:
--   - public_profile_active / public_profile_activated_at / slug
--     (only supposed to flip after verify-profile-payment confirms a
--     real Razorpay payment — this is the "Official Booking Profile"
--     badge shown in the marketplace)
--   - verified / rating / review_count (admin verification / review
--     aggregates)
--   - trial_ends_at / trial_reminder_sent_at /
--     trial_expired_notice_sent_at / subscription_active /
--     subscription_expires_at (paid subscription state)
--   - verification_status — normally admin-only, EXCEPT vendor/worker
--     profile.tsx intentionally resets this to 'pending' themselves
--     when the owner edits and resubmits their profile, which is
--     correct existing behaviour and must keep working.
--
-- This isn't just a theoretical direct-API risk either: vendor/worker
-- profile.tsx saves with `.update({ ...form, verification_status:
-- 'pending' })`, and `form` was populated from an earlier `select('*')`
-- — so it already carries the row's current `verified`,
-- `public_profile_active`, `rating` etc. values in local state. Any
-- tampering with that in-memory state before hitting submit would
-- have silently written back through that same spread.
--
-- Fix: a BEFORE UPDATE trigger on all three tables that forces these
-- columns back to their previous value for any actor who isn't the
-- service role (edge functions) or an admin — regardless of what the
-- update statement tried to set them to. `verification_status` gets a
-- narrower rule: owners may only ever move it to 'pending', never to
-- 'approved'/'rejected'/'suspended'/'blacklisted'. Columns that are
-- genuinely meant to be owner-controlled (`status`/`marketplace_visible`
-- publish toggles) are left untouched.
-- ============================================================

create or replace function public.protect_halls_privileged_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' or public.has_role(auth.uid(), 'admin') then
    return new;
  end if;

  new.verified := old.verified;
  new.rating := old.rating;
  new.review_count := old.review_count;
  new.public_profile_active := old.public_profile_active;
  new.public_profile_activated_at := old.public_profile_activated_at;
  new.slug := old.slug;
  new.trial_ends_at := old.trial_ends_at;
  new.trial_reminder_sent_at := old.trial_reminder_sent_at;
  new.trial_expired_notice_sent_at := old.trial_expired_notice_sent_at;
  new.subscription_active := old.subscription_active;
  new.subscription_expires_at := old.subscription_expires_at;

  if old.verification_status is distinct from new.verification_status
     and new.verification_status is distinct from 'pending' then
    new.verification_status := old.verification_status;
  end if;

  return new;
end $$;

drop trigger if exists halls_protect_privileged_columns on public.halls;
create trigger halls_protect_privileged_columns
  before update on public.halls
  for each row execute function public.protect_halls_privileged_columns();


create or replace function public.protect_vendors_privileged_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' or public.has_role(auth.uid(), 'admin') then
    return new;
  end if;

  new.verified := old.verified;
  new.rating := old.rating;
  new.review_count := old.review_count;
  new.public_profile_active := old.public_profile_active;
  new.public_profile_activated_at := old.public_profile_activated_at;
  new.slug := old.slug;
  new.trial_ends_at := old.trial_ends_at;
  new.subscription_active := old.subscription_active;
  new.subscription_expires_at := old.subscription_expires_at;

  if old.verification_status is distinct from new.verification_status
     and new.verification_status is distinct from 'pending' then
    new.verification_status := old.verification_status;
  end if;

  return new;
end $$;

drop trigger if exists vendors_protect_privileged_columns on public.vendors;
create trigger vendors_protect_privileged_columns
  before update on public.vendors
  for each row execute function public.protect_vendors_privileged_columns();


create or replace function public.protect_workers_privileged_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' or public.has_role(auth.uid(), 'admin') then
    return new;
  end if;

  new.verified := old.verified;
  new.rating := old.rating;
  new.review_count := old.review_count;
  new.public_profile_active := old.public_profile_active;
  new.public_profile_activated_at := old.public_profile_activated_at;
  new.slug := old.slug;

  if old.verification_status is distinct from new.verification_status
     and new.verification_status is distinct from 'pending' then
    new.verification_status := old.verification_status;
  end if;

  return new;
end $$;

drop trigger if exists workers_protect_privileged_columns on public.workers;
create trigger workers_protect_privileged_columns
  before update on public.workers
  for each row execute function public.protect_workers_privileged_columns();

-- ------------------------------------------------------------
-- AUDIT — run this yourself right after applying this migration.
-- Lists every hall/vendor/worker currently marked
-- public_profile_active = true, so you can cross-check each one
-- against a real row in public_profile_payments with status = 'paid'.
-- Anything active with no matching paid record was granted the badge
-- through the gap this migration closes, and should be turned off:
--   update public.halls set public_profile_active = false where id = '<id>';
-- (run as service role / in the SQL editor, which bypasses the new
-- trigger's owner restriction the same way admin actions do)
-- ------------------------------------------------------------
-- select 'hall' as kind, h.id, h.name, h.owner_id, h.public_profile_active,
--        exists (select 1 from public.public_profile_payments p
--                 where p.entity_id = h.id and p.role = 'venue' and p.status = 'paid') as has_paid_record
-- from public.halls h where h.public_profile_active
-- union all
-- select 'vendor', v.id, v.business_name, v.owner_id, v.public_profile_active,
--        exists (select 1 from public.public_profile_payments p
--                 where p.entity_id = v.id and p.role = 'vendor' and p.status = 'paid')
-- from public.vendors v where v.public_profile_active
-- union all
-- select 'worker', w.id, w.full_name, w.owner_id, w.public_profile_active,
--        exists (select 1 from public.public_profile_payments p
--                 where p.entity_id = w.id and p.role = 'worker' and p.status = 'paid')
-- from public.workers w where w.public_profile_active;
