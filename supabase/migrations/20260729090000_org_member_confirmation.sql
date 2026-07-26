-- ============================================================
-- Adds a "pending_confirmation" step between "invited" and "active":
-- Invite accepted -> pending_confirmation -> org head clicks Confirm -> active
-- This is an ORG-INTERNAL confirmation, separate from platform Admin
-- verification (Super Admin never sees this — it's scoped to is_org_manager).
-- ============================================================

alter table public.org_members drop constraint if exists org_members_status_check;
alter table public.org_members add constraint org_members_status_check
  check (status in ('invited','pending_confirmation','active','removed'));

NOTIFY pgrst, 'reload schema';
