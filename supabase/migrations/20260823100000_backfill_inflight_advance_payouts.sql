-- Booking rows that were ALREADY sitting on a paid advance (with the
-- final price already set) before migration 20260823090000 shipped
-- never fire the new trigger — the trigger only reacts to a fresh
-- payment_status transition INTO 'partial', and these bookings were
-- already 'partial' before this feature existed. Without this
-- backfill they stay invisible in "Payouts owed" forever (their
-- payment_status will only ever move 'partial' -> 'paid' once, and by
-- then this becomes a 'balance' payout with 0 commission — the
-- advance-stage commission/payout would simply never get created).
--
-- This runs the exact same charge-commission-against-the-advance
-- logic the trigger uses, once, for every such booking, so each one
-- gets its 'advance' venue_payouts row (with UPI id, net amount, etc.)
-- exactly as if the advance had been paid after the feature shipped.
do $$
declare
  v_rate numeric;
  r record;
  v_commission numeric;
begin
  select commission_rate_venue into v_rate from public.platform_settings limit 1;

  for r in
    select cb.id, cb.amount, cb.advance_paid_amount, h.owner_id
    from public.customer_bookings cb
    join public.halls h on h.id = cb.target_id
    where cb.kind = 'hall'
      and cb.payment_status = 'partial'
      and cb.amount is not null
      and cb.commission_calculated_at is null
  loop
    v_commission := round(coalesce(r.amount, 0) * coalesce(v_rate, 0) / 100, 2);

    update public.customer_bookings
    set commission_amount = v_commission, commission_calculated_at = now()
    where id = r.id;

    if r.owner_id is not null then
      insert into public.venue_payouts (booking_id, hall_owner_id, amount, stage, gross_amount, commission_amount)
      values (r.id, r.owner_id, greatest(coalesce(r.advance_paid_amount, 0) - v_commission, 0), 'advance', coalesce(r.advance_paid_amount, 0), v_commission)
      on conflict (booking_id, stage) do nothing;
    end if;
  end loop;
end $$;
