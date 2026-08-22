-- ============================================================
-- FIX: customer_bookings_create_payout (hall/venue booking payout
-- trigger) was still installed as AFTER UPDATE — left over from its
-- original creation in 20260802100000_event_linking_and_hall_payment.sql.
-- The per_role_commission migration (20260806100000) redefined the
-- underlying function to also SET new.commission_amount, and correctly
-- switched worker_tasks/vendor_tasks to BEFORE UPDATE so that
-- assignment actually persists — but the hall trigger itself was only
-- re-created behind an `if not exists` guard, so it silently kept
-- running as AFTER UPDATE.
--
-- Effect of the bug: in an AFTER trigger, assigning to NEW.<column> has
-- no effect on the stored row (Postgres has already written it by the
-- time an AFTER trigger runs). So customer_bookings.commission_amount
-- stayed 0 for every hall booking, even though the venue_payouts insert
-- in the SAME function call (using the local computation, not the
-- table column) was still correct. Net effect: venue_payouts amounts
-- were right, but customer_bookings.commission_amount — and everything
-- that reads it directly (platform_commission_ledger view, the Event
-- Payments admin page) — showed commission as ₹0 for hall bookings.
--
-- Fix: drop and recreate as BEFORE UPDATE, matching worker_tasks/
-- vendor_tasks. Also backfill commission_amount on existing paid rows
-- so historical bookings aren't stuck showing ₹0.
-- ============================================================

drop trigger if exists customer_bookings_create_payout on public.customer_bookings;

create trigger customer_bookings_create_payout before update on public.customer_bookings
  for each row execute function public.tg_hall_booking_create_payout();

-- Backfill: for already-paid hall bookings sitting at commission_amount
-- = 0, derive the real commission from the venue_payouts row that was
-- already inserted at the time (amount - what the owner was actually
-- paid) rather than recomputing from today's rate — the rate may have
-- changed since, and the payout row reflects what really happened.
--
-- customer_bookings_not_in_past (added 20260819140000) re-validates
-- event_date >= created_at::date on EVERY update to the row, even one
-- that only touches commission_amount — and some existing test/live
-- rows have an event_date earlier than created_at, so a plain UPDATE
-- here gets rejected by that constraint even though this backfill has
-- nothing to do with event_date. Drop it for the duration of the
-- backfill and put it right back (still NOT VALID, same as before) so
-- normal app behavior is unaffected afterwards.
alter table public.customer_bookings drop constraint if exists customer_bookings_not_in_past;

update public.customer_bookings b
set commission_amount = greatest(coalesce(b.amount, 0) - vp.amount, 0)
from public.venue_payouts vp
where vp.booking_id = b.id
  and b.kind = 'hall'
  and b.payment_status = 'paid'
  and b.commission_amount = 0;

-- Any paid hall booking with commission still 0 AND no venue_payouts
-- row at all (shouldn't normally happen, but covers it) falls back to
-- today's rate so it isn't left showing ₹0 forever.
do $$
declare
  v_rate numeric;
begin
  select commission_rate_venue into v_rate from public.platform_settings limit 1;

  update public.customer_bookings b
  set commission_amount = round(coalesce(b.amount, 0) * coalesce(v_rate, 0) / 100, 2)
  where b.kind = 'hall'
    and b.payment_status = 'paid'
    and b.commission_amount = 0
    and not exists (select 1 from public.venue_payouts vp where vp.booking_id = b.id);
end $$;

-- Put the guard back exactly as it was — NOT VALID, so it doesn't
-- retroactively fail on old rows, only enforces going forward.
alter table public.customer_bookings add constraint customer_bookings_not_in_past
  check (event_date is null or event_date >= created_at::date) not valid;
