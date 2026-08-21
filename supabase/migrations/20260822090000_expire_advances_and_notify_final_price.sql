-- ============================================================
-- 1) Auto-expire hall bookings stuck waiting on an unpaid advance.
--
-- Once a venue owner confirms a booking and sets the advance amount
-- (migration 20260819150000), nothing ever followed up if the
-- customer just never paid — the booking sat "confirmed" forever,
-- silently holding that date as unavailable to everyone else with no
-- way for the venue owner to reclaim it short of manually cancelling.
--
-- Fix: a daily job that finds bookings confirmed more than 5 days ago
-- with payment_status still 'pending' (advance never paid) and
-- reverts them to 'cancelled'. Cancelling flows through the existing
-- hall_booking_sync_blocked_dates trigger (20260819140000), which
-- frees the date automatically. A day before that, at 4 days
-- unpaid, the customer gets a reminder notification instead of an
-- immediate cancellation — so they get a real chance to pay first.
-- ============================================================

alter table public.customer_bookings add column if not exists advance_reminder_sent_at timestamptz;

create or replace function public.expire_unpaid_hall_advances()
returns void language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  -- Day 4: one reminder, never repeated.
  for r in
    select id, user_id, target_name from public.customer_bookings
    where kind = 'hall' and status = 'confirmed' and payment_status = 'pending'
      and advance_amount is not null and advance_amount > 0
      and advance_reminder_sent_at is null
      and updated_at <= now() - interval '4 days'
  loop
    insert into public.customer_notifications (user_id, kind, title, body, action_url)
    values (r.user_id, 'booking', 'Advance payment pending',
            'Your booking for "' || r.target_name || '" will be cancelled soon if the advance isn''t paid — please pay to keep your date.',
            '/customer/bookings');
    update public.customer_bookings set advance_reminder_sent_at = now() where id = r.id;
  end loop;

  -- Day 5: actually expire it. Setting status='cancelled' fires the
  -- existing blocked_dates trigger, so the date frees up automatically.
  update public.customer_bookings
  set status = 'cancelled', notes = coalesce(notes || ' — ', '') || 'Auto-cancelled: advance not paid within 5 days of confirmation.'
  where kind = 'hall' and status = 'confirmed' and payment_status = 'pending'
    and advance_amount is not null and advance_amount > 0
    and updated_at <= now() - interval '5 days';
end $$;

do $$ begin
  create extension if not exists pg_cron with schema extensions;
exception when insufficient_privilege then null; end $$;

do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('expire-unpaid-hall-advances-daily');
  end if;
exception when others then null; end $$;

do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('expire-unpaid-hall-advances-daily', '0 4 * * *', $cron$select public.expire_unpaid_hall_advances();$cron$);
  end if;
exception when others then null; end $$;

-- ============================================================
-- 2) Notify the customer the moment the venue owner sets (or updates)
-- the final price — previously they'd only find out by opening the
-- app and checking their bookings page themselves.
-- ============================================================

create or replace function public.tg_notify_final_price_set()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'hall' and new.amount is not null and (old.amount is null or old.amount is distinct from new.amount) then
    insert into public.customer_notifications (user_id, kind, title, body, action_url)
    values (new.user_id, 'booking', 'Your venue price is ready',
            'The final price for "' || new.target_name || '" is ₹' || new.amount || ' — pay the remaining balance to confirm.',
            '/customer/bookings');
  end if;
  return new;
end $$;

drop trigger if exists notify_final_price_set on public.customer_bookings;
create trigger notify_final_price_set after update on public.customer_bookings
  for each row execute function public.tg_notify_final_price_set();
