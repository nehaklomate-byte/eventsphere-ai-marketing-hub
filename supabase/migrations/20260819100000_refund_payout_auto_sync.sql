-- ============================================================
-- Refund → payment/payout auto-sync.
--
-- Root cause: public.refunds only ever recorded the refund REQUEST
-- itself (status requested/approved/rejected/processed). Marking a
-- refund "processed" never touched the underlying booking's
-- payment_status, and never touched the worker_payouts/vendor_payouts/
-- venue_payouts row for that booking — so a refunded booking still
-- silently said "payment_status = paid" everywhere else, and the
-- platform could still pay the partner out in full (or already had)
-- for money that had been returned to the customer. Commission never
-- got reversed either.
--
-- Fix: when admin flips a refund to 'processed', a trigger now:
--   1. Marks the source booking/task's payment_status = 'refunded'.
--   2. If the matching payout hasn't been sent yet, cancels it
--      (status = 'cancelled') so admin never accidentally pays it.
--   3. If the payout was ALREADY sent (status = 'paid'), this cannot
--      un-send real money — it flags the payout status =
--      'clawback_required' instead, so it's impossible to miss on the
--      admin Payouts screen, and writes an audit_logs entry recording
--      exactly what happened and why.
-- ============================================================

-- 1) Widen payout status values to cover the two new outcomes above.
alter table public.worker_payouts drop constraint if exists worker_payouts_status_check;
alter table public.worker_payouts add constraint worker_payouts_status_check
  check (status in ('pending','paid','cancelled','clawback_required'));
alter table public.worker_payouts add column if not exists notes text;

alter table public.vendor_payouts drop constraint if exists vendor_payouts_status_check;
alter table public.vendor_payouts add constraint vendor_payouts_status_check
  check (status in ('pending','paid','cancelled','clawback_required'));
alter table public.vendor_payouts add column if not exists notes text;

alter table public.venue_payouts drop constraint if exists venue_payouts_status_check;
alter table public.venue_payouts add constraint venue_payouts_status_check
  check (status in ('pending','paid','cancelled','clawback_required'));
alter table public.venue_payouts add column if not exists notes text;

-- Profile-activation/subscription payments have no payout owed to
-- anyone (100% platform revenue) so there's nothing to claw back —
-- just widen the status so a refunded one can be told apart from a
-- merely-failed one in reports.
alter table public.public_profile_payments drop constraint if exists public_profile_payments_status_check;
alter table public.public_profile_payments add constraint public_profile_payments_status_check
  check (status in ('created','paid','failed','refunded'));

-- 2) The sync trigger itself.
create or replace function public.tg_refund_processed_sync()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_note text := 'Auto-cancelled: booking refund #' || new.id || ' processed on ' || now()::date;
begin
  if new.status <> 'processed' then
    return new;
  end if;
  if old.status = 'processed' then
    return new; -- already synced once, never double-apply
  end if;

  if new.source_type = 'booking' then
    update public.customer_bookings set payment_status = 'refunded' where id = new.source_id;
    update public.venue_payouts set status = 'cancelled', notes = v_note
      where booking_id = new.source_id and status = 'pending';
    update public.venue_payouts set status = 'clawback_required', notes = v_note
      where booking_id = new.source_id and status = 'paid';

  elsif new.source_type = 'worker_task' then
    update public.worker_tasks set payment_status = 'refunded' where id = new.source_id;
    update public.worker_payouts set status = 'cancelled', notes = v_note
      where worker_task_id = new.source_id and status = 'pending';
    update public.worker_payouts set status = 'clawback_required', notes = v_note
      where worker_task_id = new.source_id and status = 'paid';

  elsif new.source_type = 'vendor_task' then
    update public.vendor_tasks set payment_status = 'refunded' where id = new.source_id;
    update public.vendor_payouts set status = 'cancelled', notes = v_note
      where vendor_task_id = new.source_id and status = 'pending';
    update public.vendor_payouts set status = 'clawback_required', notes = v_note
      where vendor_task_id = new.source_id and status = 'paid';

  elsif new.source_type = 'profile_payment' then
    update public.public_profile_payments set status = 'refunded' where id = new.source_id;
  end if;

  insert into public.audit_logs (actor_id, action, target_table, target_id, old_value, new_value)
  values (new.processed_by, 'refund_processed_sync', 'refunds', new.id,
          jsonb_build_object('refund_status', old.status),
          jsonb_build_object('refund_status', new.status, 'source_type', new.source_type, 'source_id', new.source_id, 'amount', new.amount));

  return new;
end $$;

drop trigger if exists refund_processed_sync on public.refunds;
create trigger refund_processed_sync after update on public.refunds
  for each row execute function public.tg_refund_processed_sync();

-- ------------------------------------------------------------
-- AUDIT — run separately to find any already-processed refunds from
-- BEFORE this migration that never got synced (their booking still
-- says payment_status = 'paid' even though it was refunded). You'll
-- need to fix these by hand, once, since the trigger only fires going
-- forward on new status changes:
-- ------------------------------------------------------------
-- select r.id, r.source_type, r.source_id, r.amount, r.processed_at
-- from public.refunds r
-- where r.status = 'processed'
-- order by r.processed_at desc;
