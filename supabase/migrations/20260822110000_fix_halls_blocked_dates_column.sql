-- ============================================================
-- FIX: halls.blocked_dates was never actually created.
--
-- 20260819140000_hall_double_booking_guard.sql added a trigger that
-- reads/writes public.halls.blocked_dates on every hall-booking
-- confirm/cancel, and its own comment claimed the column "already
-- existed as a column (migration 20260706070753)". That's incorrect
-- — 20260706070753 added `blocked_dates` to public.workers, not
-- public.halls (public.vendors got its own copy separately in
-- 20260801100000_vendor_module.sql). Halls never got one.
--
-- Net effect: every "Price & confirm" on a hall booking has been
-- failing with `column "blocked_dates" does not exist` since
-- 20260819140000 was applied — this is the exact bug reported
-- (pricing/confirm silently/loudly not going through).
--
-- Fix: add the column now, same shape as workers/vendors use it —
-- jsonb array of ISO date strings, defaulting to empty.
-- ============================================================

alter table public.halls add column if not exists blocked_dates jsonb not null default '[]'::jsonb;

comment on column public.halls.blocked_dates is
  'Dates already claimed by a confirmed booking on this hall, kept in sync by hall_booking_sync_blocked_dates (20260819140000). Missing until this migration, which is why confirming a hall booking previously failed with "column blocked_dates does not exist".';
