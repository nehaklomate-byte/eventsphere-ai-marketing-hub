-- ============================================================
-- Advance/Balance payout split for hall bookings.
--
-- PROBLEM (reported by a venue owner): booking total ₹82,689, customer
-- paid a ₹24,000 advance — nowhere in the app does this show up as
-- money owed to the venue. Root cause: tg_hall_booking_create_payout()
-- only ever fires `if new.payment_status = 'paid'` — an advance
-- payment only moves payment_status to 'partial' (migration
-- 20260819150000), so no venue_payouts row, no commission calc, no
-- payout entry gets created until the ENTIRE booking is settled. Until
-- then the platform is sitting on collected money with zero record of
-- what it owes the venue for it.
--
-- FIX — new behaviour:
--   1. The platform's commission is charged ONCE per booking, on the
--      full final price (`amount`), the first moment both the final
--      price AND some payment are known — usually the advance. It is
--      never charged twice.
--   2. That first payment creates a payout row (stage = 'advance')
--      net of the FULL commission.
--   3. Whatever comes in later for the SAME booking (the balance) is
--      a SEPARATE payout row (stage = 'balance') passed to the venue
--      at 100% — commission was already collected upfront, so it is
--      not charged again.
--   4. A booking that never uses the advance flow (goes straight
--      pending -> paid) behaves exactly as before: one payout row,
--      stage = 'full'.
--   5. Each payout row stores its OWN gross_amount/commission_amount
--      (not derived from customer_bookings at read time), so receipts
--      and admin screens can show "customer paid X, commission Y, net
--      Z" per stage without recomputing anything — and so each stage
--      of each booking renders as its own distinct line, never merged
--      with another stage or another booking.
-- ============================================================

-- 1) Track whether/when commission has already been charged for a
--    booking, so the balance payment never gets double-charged.
alter table public.customer_bookings
  add column if not exists commission_calculated_at timestamptz;

-- Backfill: every hall booking that's already paid in full today was
-- charged under the old single-shot logic — mark it as "already
-- calculated" so this migration can't re-touch it.
--
-- customer_bookings_not_in_past (added 20260819140000) re-validates
-- event_date >= created_at::date on EVERY update to the row, even one
-- that only touches commission_calculated_at — and some existing
-- test/live rows have an event_date earlier than created_at, so a
-- plain UPDATE here gets rejected by that constraint even though this
-- backfill has nothing to do with event_date (same issue already
-- worked around once in 20260822120000). Drop it for the duration of
-- the backfill and put it right back (still NOT VALID) afterwards.
alter table public.customer_bookings drop constraint if exists customer_bookings_not_in_past;

update public.customer_bookings
set commission_calculated_at = coalesce(paid_at, created_at)
where kind = 'hall' and payment_status = 'paid' and commission_calculated_at is null;

alter table public.customer_bookings add constraint customer_bookings_not_in_past
  check (event_date is null or event_date >= created_at::date) not valid;

-- 2) venue_payouts: one row per PAYMENT EVENT for a booking, not one
--    row per booking. Add `stage` and the row's own gross/commission
--    breakdown.
alter table public.venue_payouts
  add column if not exists stage text not null default 'full'
    check (stage in ('advance', 'balance', 'full'));
alter table public.venue_payouts
  add column if not exists gross_amount numeric(12,2);
alter table public.venue_payouts
  add column if not exists commission_amount numeric(12,2) not null default 0;

-- Backfill existing rows (all pre-date this migration, so they're all
-- one-shot "full" payouts) with the gross/commission that produced
-- them, straight from the booking they belong to.
update public.venue_payouts vp
set gross_amount = coalesce(cb.amount, 0),
    commission_amount = coalesce(cb.commission_amount, 0)
from public.customer_bookings cb
where cb.id = vp.booking_id and vp.gross_amount is null;

-- Was `unique(booking_id)` — one row per booking. Now one row per
-- (booking, stage), since a booking can have an advance payout AND a
-- balance payout.
alter table public.venue_payouts drop constraint if exists venue_payouts_booking_id_key;
alter table public.venue_payouts drop constraint if exists venue_payouts_booking_stage_key;
alter table public.venue_payouts add constraint venue_payouts_booking_stage_key unique (booking_id, stage);

-- 3) The trigger itself — now handles three moments instead of one.
create or replace function public.tg_hall_booking_create_payout()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner_id uuid;
  v_rate numeric;
  v_advance_gross numeric;
  v_balance_gross numeric;
begin
  if new.kind <> 'hall' then
    return new;
  end if;

  select owner_id into v_owner_id from public.halls where id = new.target_id;

  -- Case A: the owner has just set the final price for a booking that
  -- was already sitting on a paid advance with the price still
  -- unknown (`amount` null -> not null), and commission hasn't been
  -- charged yet. Charge the full commission now, against the advance
  -- already collected.
  if old.amount is null and new.amount is not null
     and new.payment_status = 'partial'
     and old.commission_calculated_at is null then
    select commission_rate_venue into v_rate from public.platform_settings limit 1;
    new.commission_amount := round(coalesce(new.amount, 0) * coalesce(v_rate, 0) / 100, 2);
    new.commission_calculated_at := now();
    v_advance_gross := coalesce(new.advance_paid_amount, 0);
    if v_owner_id is not null then
      insert into public.venue_payouts (booking_id, hall_owner_id, amount, stage, gross_amount, commission_amount)
      values (new.id, v_owner_id, greatest(v_advance_gross - new.commission_amount, 0), 'advance', v_advance_gross, new.commission_amount)
      on conflict (booking_id, stage) do nothing;
    end if;
    return new;
  end if;

  -- Case B: the advance just cleared (payment_status -> 'partial')
  -- and the final price was already known at that point (owner set it
  -- up front). Charge the full commission now, against the advance.
  if new.payment_status = 'partial' and old.payment_status is distinct from 'partial'
     and new.amount is not null and old.commission_calculated_at is null then
    select commission_rate_venue into v_rate from public.platform_settings limit 1;
    new.commission_amount := round(coalesce(new.amount, 0) * coalesce(v_rate, 0) / 100, 2);
    new.commission_calculated_at := now();
    v_advance_gross := coalesce(new.advance_paid_amount, 0);
    if v_owner_id is not null then
      insert into public.venue_payouts (booking_id, hall_owner_id, amount, stage, gross_amount, commission_amount)
      values (new.id, v_owner_id, greatest(v_advance_gross - new.commission_amount, 0), 'advance', v_advance_gross, new.commission_amount)
      on conflict (booking_id, stage) do nothing;
    end if;
    return new;
  end if;

  -- Case C: the booking is now fully paid — either the balance just
  -- cleared (commission was already charged on the advance), or this
  -- booking never went through the advance flow at all (commission
  -- has not been charged yet, so charge it now on the whole amount,
  -- same as the original single-shot behaviour).
  if new.payment_status = 'paid' and old.payment_status is distinct from 'paid' then
    if old.commission_calculated_at is null then
      select commission_rate_venue into v_rate from public.platform_settings limit 1;
      new.commission_amount := round(coalesce(new.amount, 0) * coalesce(v_rate, 0) / 100, 2);
      new.commission_calculated_at := now();
      if v_owner_id is not null then
        insert into public.venue_payouts (booking_id, hall_owner_id, amount, stage, gross_amount, commission_amount)
        values (new.id, v_owner_id, greatest(coalesce(new.amount, 0) - new.commission_amount, 0), 'full', coalesce(new.amount, 0), new.commission_amount)
        on conflict (booking_id, stage) do nothing;
      end if;
    else
      -- Commission already fully collected against the advance — the
      -- balance now clearing is 100% owed to the venue.
      v_balance_gross := greatest(coalesce(new.amount, 0) - coalesce(new.advance_paid_amount, 0), 0);
      if v_owner_id is not null then
        insert into public.venue_payouts (booking_id, hall_owner_id, amount, stage, gross_amount, commission_amount)
        values (new.id, v_owner_id, v_balance_gross, 'balance', v_balance_gross, 0)
        on conflict (booking_id, stage) do nothing;
      end if;
    end if;
  end if;

  return new;
end $$;

-- 4) platform_commission_ledger view: it LEFT JOINs venue_payouts by
--    booking_id assuming one row per booking. A booking can now have
--    two (advance + balance), which would silently double the hall
--    rows (and double-count totals) in every screen that reads this
--    view. Aggregate to one payout-status per booking instead — the
--    booking's own gross_amount/commission_amount columns are
--    unaffected by how many payout rows exist underneath.
create or replace view public.platform_commission_ledger as
select
  'hall'::text as source_type,
  b.id as source_id,
  b.customer_event_id,
  b.target_name as counterparty_label,
  b.amount as gross_amount,
  b.commission_amount as commission_amount,
  greatest(b.amount - b.commission_amount, 0) as partner_net_amount,
  b.payment_status::text,
  vp.status as payout_status,
  vp.payout_id as payout_id,
  b.razorpay_payment_id,
  b.paid_at,
  b.created_at
from public.customer_bookings b
left join (
  select
    booking_id,
    (array_agg(id order by created_at desc))[1] as payout_id,
    case
      when bool_or(status = 'pending') then 'pending'
      when bool_or(status = 'clawback_required') then 'clawback_required'
      when bool_or(status = 'cancelled') and not bool_or(status = 'paid') then 'cancelled'
      else 'paid'
    end as status
  from public.venue_payouts
  group by booking_id
) vp on vp.booking_id = b.id
where b.kind = 'hall'

union all

select
  'vendor'::text,
  t.id,
  t.customer_event_id,
  coalesce(v.business_name, 'Vendor') || ' — ' || t.task_name,
  t.payment_amount,
  t.commission_amount,
  greatest(coalesce(t.payment_amount, 0) - coalesce(t.commission_amount, 0), 0),
  t.payment_status::text,
  vpo.status,
  vpo.id,
  t.razorpay_payment_id,
  t.paid_at,
  t.created_at
from public.vendor_tasks t
left join public.vendors v on v.id = t.vendor_id
left join public.vendor_payouts vpo on vpo.vendor_task_id = t.id

union all

select
  'worker'::text,
  t.id,
  t.customer_event_id,
  coalesce(w.full_name, 'Worker') || ' — ' || t.task_name,
  t.payment_amount,
  t.commission_amount,
  greatest(coalesce(t.payment_amount, 0) - coalesce(t.commission_amount, 0), 0),
  t.payment_status::text,
  wpo.status,
  wpo.id,
  t.razorpay_payment_id,
  t.paid_at,
  t.created_at
from public.worker_tasks t
left join public.workers w on w.id = t.worker_id
left join public.worker_payouts wpo on wpo.worker_task_id = t.id;

alter view public.platform_commission_ledger set (security_invoker = true);
grant select on public.platform_commission_ledger to authenticated;
