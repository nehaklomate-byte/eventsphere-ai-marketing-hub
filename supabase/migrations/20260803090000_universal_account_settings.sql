-- ============================================================
-- Universal Account Settings (Phase 1 of the settings spec) —
-- applies to every role via a shared component, not duplicated per role.
--
-- Rather than 40+ individual boolean columns for every notification
-- type × channel combination, privacy toggle, etc., this uses ONE
-- `preferences` jsonb column with a documented shape (see
-- DEFAULT_PREFERENCES in src/lib/settings.ts). Structured, indexable if
-- ever needed, and far easier to extend later than a wide table.
-- ============================================================

alter table public.profiles
  add column if not exists username text unique,
  add column if not exists date_of_birth date,
  add column if not exists gender text,
  add column if not exists language_preference text not null default 'en',
  add column if not exists timezone text not null default 'Asia/Kolkata',
  add column if not exists preferences jsonb not null default '{
    "theme": "system",
    "font_size": "normal",
    "compact_view": false,
    "privacy": {
      "public_profile": true,
      "show_mobile": false,
      "show_email": false,
      "allow_direct_chat": true,
      "allow_direct_calls": false,
      "search_visible": true,
      "hide_last_active": false
    },
    "notify": {
      "push":  { "new_booking": true, "new_hire_request": true, "booking_confirmed": true, "booking_cancelled": true, "payment_received": true, "new_message": true, "task_assigned": true, "task_completed": true, "review_received": true, "event_reminder": true, "admin": true },
      "email": { "new_booking": true, "new_hire_request": true, "booking_confirmed": true, "booking_cancelled": true, "payment_received": true, "new_message": false, "task_assigned": true, "task_completed": false, "review_received": true, "event_reminder": true, "admin": true },
      "sms":   { "new_booking": false, "new_hire_request": false, "booking_confirmed": true, "booking_cancelled": true, "payment_received": true, "new_message": false, "task_assigned": false, "task_completed": false, "review_received": false, "event_reminder": true, "admin": false }
    }
  }'::jsonb;

-- Account deletion requests — a real queue admin can act on, not just a
-- button that does nothing. Reuses the existing audit_logs table for
-- the actual admin-facing trail (see lib/admin.ts's writeAudit).
create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  status text not null default 'pending' check (status in ('pending','cancelled','completed')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (user_id, status)
);
grant select, insert, update on public.account_deletion_requests to authenticated;
grant all on public.account_deletion_requests to service_role;
alter table public.account_deletion_requests enable row level security;

drop policy if exists "user manages own deletion request" on public.account_deletion_requests;
create policy "user manages own deletion request" on public.account_deletion_requests
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "admin reads all deletion requests" on public.account_deletion_requests;
create policy "admin reads all deletion requests" on public.account_deletion_requests
  for select to authenticated using (public.has_role(auth.uid(),'admin'));
drop policy if exists "admin updates deletion requests" on public.account_deletion_requests;
create policy "admin updates deletion requests" on public.account_deletion_requests
  for update to authenticated using (public.has_role(auth.uid(),'admin'));
