-- ============================================================
-- Multi-day events — start date + end date instead of one event_date.
--
-- Real events (weddings especially) often span more than one day
-- (mehendi/haldi day + main function day, or a 2-day setup+event
-- booking). Until now customer_bookings and customer_events only had
-- a single event_date, so there was no way to represent that.
--
-- event_date is kept as-is (nothing that reads it breaks) and now
-- means "start date" — event_end_date is new and optional; when not
-- set, it's a single-day event exactly like before. No pricing is
-- multiplied by day count here — per the "no per-day pricing" change,
-- these dates are for scheduling/availability clarity only.
-- ============================================================

alter table public.customer_bookings add column if not exists event_end_date date;
alter table public.customer_events add column if not exists event_end_date date;

alter table public.customer_bookings add constraint customer_bookings_end_after_start
  check (event_end_date is null or event_date is null or event_end_date >= event_date) not valid;
alter table public.customer_events add constraint customer_events_end_after_start
  check (event_end_date is null or event_date is null or event_end_date >= event_date) not valid;
