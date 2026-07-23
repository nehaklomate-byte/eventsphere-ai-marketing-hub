-- ============================================================
-- Admin Verification Center — schema additions
-- Adds: verification_status + documents on organizations/halls/vendors/workers,
--       admin bypass RLS policies, audit_logs, platform_notifications,
--       and a unified admin_verification_queue view.
-- Safe to run once. Uses IF NOT EXISTS / DO blocks so it will not
-- error if part of it was already applied.
-- ============================================================

-- 1. New enum for a richer verification lifecycle than the existing
--    `verified boolean` gives us (pending/approved/rejected/suspended/blacklisted).
do $$
begin
  if not exists (select 1 from pg_type where typname = 'verification_status') then
    create type public.verification_status as enum
      ('pending', 'approved', 'rejected', 'suspended', 'blacklisted');
  end if;
end $$;

-- 2. Add verification_status + supporting columns + documents vault
--    to every role table that requires admin approval.
do $$
declare
  t text;
begin
  foreach t in array array['organizations', 'halls', 'vendors', 'workers'] loop
    execute format('alter table public.%I add column if not exists verification_status public.verification_status not null default ''pending''', t);
    execute format('alter table public.%I add column if not exists rejection_reason text', t);
    execute format('alter table public.%I add column if not exists verified_at timestamptz', t);
    execute format('alter table public.%I add column if not exists verified_by uuid references auth.users(id)', t);
    -- documents: array of { name, url, uploaded_at } — populated from the
    -- relevant private storage bucket (org-logos/vendor-documents/worker-media/hall-media).
    execute format('alter table public.%I add column if not exists documents jsonb not null default ''[]''::jsonb', t);
  end loop;
end $$;

-- 3. Backfill verification_status from the existing `verified` boolean
--    so nothing that was already approved becomes invisible.
update public.organizations set verification_status = 'approved' where verified = true and verification_status = 'pending';
update public.halls         set verification_status = 'approved' where verified = true and verification_status = 'pending';
update public.vendors       set verification_status = 'approved' where verified = true and verification_status = 'pending';
update public.workers       set verification_status = 'approved' where verified = true and verification_status = 'pending';

-- 4. Keep the legacy `verified` boolean in sync automatically whenever
--    verification_status changes, so existing code (e.g. marketplace.tsx
--    filtering on `verified = true`) keeps working without edits.
create or replace function public.tg_sync_verified_boolean()
returns trigger language plpgsql as $$
begin
  new.verified := (new.verification_status = 'approved');
  if new.verification_status is distinct from old.verification_status
     and new.verification_status in ('approved','rejected','suspended','blacklisted') then
    new.verified_at := now();
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['organizations', 'halls', 'vendors', 'workers'] loop
    execute format('drop trigger if exists sync_verified_boolean on public.%I', t);
    execute format('create trigger sync_verified_boolean before update on public.%I for each row execute function public.tg_sync_verified_boolean()', t);
  end loop;
end $$;

-- 5. Admin bypass RLS policies — WITHOUT these, an admin cannot see or
--    act on anyone else's pending application (this was fully missing
--    before this migration; only owner-scoped policies existed).
do $$
declare
  t text;
begin
  foreach t in array array['organizations', 'halls', 'vendors', 'workers'] loop
    execute format('drop policy if exists "Admin full read %s" on public.%I', t, t);
    execute format('create policy "Admin full read %s" on public.%I for select to authenticated using (public.has_role(auth.uid(), ''admin''))', t, t);
    execute format('drop policy if exists "Admin full update %s" on public.%I', t, t);
    execute format('create policy "Admin full update %s" on public.%I for update to authenticated using (public.has_role(auth.uid(), ''admin''))', t, t);
  end loop;
end $$;

-- 6. Audit log — every admin action (approve/reject/suspend/blacklist/restore)
--    writes one row here. Only admins can read it; only admins can insert
--    (writes happen via the app using the signed-in admin's session).
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  actor_email text,
  action text not null,               -- e.g. 'approve', 'reject', 'suspend', 'blacklist', 'restore'
  target_table text not null,         -- 'organizations' | 'halls' | 'vendors' | 'workers'
  target_id uuid not null,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);
grant select, insert on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;

drop policy if exists "Admin read audit_logs" on public.audit_logs;
create policy "Admin read audit_logs" on public.audit_logs for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
drop policy if exists "Admin write audit_logs" on public.audit_logs;
create policy "Admin write audit_logs" on public.audit_logs for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

-- 7. Shared cross-role notification table. Existing customer_notifications /
--    worker_notifications stay as-is; this new table is what the Admin
--    Verification Center uses to notify Organization / Venue Owner / Vendor
--    / Worker accounts of an approval/rejection, since those roles don't yet
--    have their own dashboards or notification tables.
create table if not exists public.platform_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  type text not null default 'info',   -- 'info' | 'success' | 'warning' | 'error'
  read_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, update on public.platform_notifications to authenticated;
grant insert on public.platform_notifications to authenticated;
grant all on public.platform_notifications to service_role;
alter table public.platform_notifications enable row level security;

drop policy if exists "Own notifications read" on public.platform_notifications;
create policy "Own notifications read" on public.platform_notifications for select to authenticated
  using (user_id = auth.uid());
drop policy if exists "Own notifications update" on public.platform_notifications;
create policy "Own notifications update" on public.platform_notifications for update to authenticated
  using (user_id = auth.uid());
drop policy if exists "Admin can notify anyone" on public.platform_notifications;
create policy "Admin can notify anyone" on public.platform_notifications for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') or user_id = auth.uid());

-- 8. One unified queue view so the Verification Center can show all four
--    role types in a single query instead of four separate round-trips.
--    security_invoker means it still respects the RLS policies above.
create or replace view public.admin_verification_queue
with (security_invoker = true) as
  select 'organization'::text as role, id, name as title, city, state, email, phone,
         verification_status, rejection_reason, documents, created_at, owner_id as user_id
    from public.organizations
  union all
  select 'venue'::text, id, name, city, state, email, phone,
         verification_status, rejection_reason, documents, created_at, owner_id
    from public.halls
  union all
  select 'vendor'::text, id, business_name, city, state, email, phone,
         verification_status, rejection_reason, documents, created_at, owner_id
    from public.vendors
  union all
  select 'worker'::text, id, full_name, city, state, email, phone,
         verification_status, rejection_reason, documents, created_at, owner_id
    from public.workers;

grant select on public.admin_verification_queue to authenticated;
