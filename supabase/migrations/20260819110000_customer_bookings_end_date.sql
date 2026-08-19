-- ============================================================
-- Multi-day venue bookings: customer now picks a start date AND an
-- end date on the Book Now form (previously only a single
-- `event_date`), and the total is computed as
-- price_per_day * number_of_days instead of a flat one-day charge
-- regardless of how long the event actually runs.
--
-- `event_date` is kept as-is (still holds the start date) so nothing
-- that already reads it — venue/admin booking lists, calendars,
-- reminders — needs to change. `end_date` is new and defaults to
-- `event_date` for existing single-day rows, so old bookings still
-- read as a normal 1-day booking.
-- ============================================================

alter table public.customer_bookings add column if not exists end_date date;
update public.customer_bookings set end_date = event_date where end_date is null and event_date is not null;
