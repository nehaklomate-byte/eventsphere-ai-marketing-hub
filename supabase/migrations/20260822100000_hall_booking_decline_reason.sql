-- ============================================================
-- Venue owner decline/cancel reason for hall bookings.
--
-- Previously, "Decline" (on a pending request) and "Cancel booking"
-- (on a confirmed one) just flipped status to 'cancelled' with
-- nothing recorded about *why* — the customer only ever saw the bare
-- word "cancelled" in their bookings list, with no way to know
-- whether it was a date clash, an unreasonable ask, or something
-- else. Support for this reason field was completely missing before
-- this migration.
--
-- Fix:
--   1. New `decline_reason` column on customer_bookings, set by the
--      venue owner at the moment they decline/cancel (src/lib/venue.ts
--      declineHallBooking, wired from the Decline/Cancel buttons in
--      src/routes/_authenticated/venue/bookings.tsx).
--   2. A trigger that, the moment a HALL booking's status flips to
--      'cancelled' with a decline_reason present, inserts an in-app
--      notification for the customer that includes the reason
--      verbatim — mirroring the existing tg_notify_final_price_set
--      pattern (20260822090000) rather than inventing a new one.
--      (The auto-expiry job in that same migration also sets
--      status='cancelled' but never sets decline_reason, so it does
--      not fire this notification — it already sends its own.)
-- ============================================================

alter table public.customer_bookings add column if not exists decline_reason text;

comment on column public.customer_bookings.decline_reason is
  'Why the venue owner declined a pending request or cancelled a confirmed hall booking — shown to the customer. Null for cancellations the customer made themselves.';

create or replace function public.tg_notify_hall_booking_declined()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'hall' and new.status = 'cancelled' and old.status is distinct from 'cancelled'
     and new.decline_reason is not null and length(trim(new.decline_reason)) > 0 then
    insert into public.customer_notifications (user_id, kind, title, body, action_url)
    values (new.user_id, 'booking',
            case when old.status = 'pending' then 'Your booking request was declined' else 'Your booking was cancelled' end,
            'For "' || new.target_name || '": ' || new.decline_reason,
            '/customer/bookings');
  end if;
  return new;
end $$;

drop trigger if exists notify_hall_booking_declined on public.customer_bookings;
create trigger notify_hall_booking_declined after update on public.customer_bookings
  for each row execute function public.tg_notify_hall_booking_declined();
