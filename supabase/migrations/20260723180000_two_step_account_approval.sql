-- ============================================================
-- Two-step verification for non-customer roles
--
-- Step 1 (account approval): right after registration, an Organization /
--   Venue Owner / Vendor / Worker account sits in "pending_approval" and
--   cannot open their dashboard or profile form at all — just a "waiting
--   for admin approval" screen. Admin approves the *account* first (this
--   is a lightweight anti-spam/anti-fake-signup gate).
-- Step 2 (profile verification): once their account is approved, they can
--   fill in their full profile (halls/vendors/workers/organizations row,
--   already created at registration — see register.tsx) and submit it.
--   That's the *existing* verification_status flow from the earlier
--   admin-verification-center migration. Only once THAT is approved do
--   they get the "Verified" badge shown to customers, and only verified
--   listings are marketplace-visible.
--
-- customer and admin roles skip step 1 entirely (auto-approved).
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'account_status') then
    create type public.account_status as enum ('pending_approval', 'approved', 'rejected');
  end if;
end $$;

alter table public.profiles add column if not exists account_status public.account_status;
alter table public.profiles add column if not exists account_rejection_reason text;

-- Backfill: anyone who already exists gets a sensible status so nobody
-- already using the product is unexpectedly locked out by this migration.
update public.profiles
set account_status = case when primary_role in ('customer','admin') then 'approved' else 'approved' end
where account_status is null;
-- ^ existing rows are grandfathered in as 'approved' (they were already
--   using their dashboards under the old single-step flow) — only NEW
--   signups from this point on go through the two-step flow below.

-- Auto-set the correct starting status for every NEW profile: customers
-- and admins skip straight to 'approved'; every other role starts at
-- 'pending_approval'. Only fires when the caller didn't already set it
-- explicitly (so an admin's own approval UPDATE is never overwritten).
create or replace function public.tg_set_account_status()
returns trigger language plpgsql as $$
begin
  if new.primary_role is not null and new.account_status is null then
    new.account_status := case when new.primary_role in ('customer','admin') then 'approved' else 'pending_approval' end;
  end if;
  return new;
end;
$$;

drop trigger if exists set_account_status on public.profiles;
create trigger set_account_status before insert or update of primary_role on public.profiles
  for each row execute function public.tg_set_account_status();

-- Admin needs to UPDATE other people's profiles to approve/reject accounts
-- (the earlier migration only granted SELECT on profiles, not UPDATE).
drop policy if exists "Admin updates all profiles" on public.profiles;
create policy "Admin updates all profiles" on public.profiles for update to authenticated
  using (public.has_role(auth.uid(), 'admin'));
