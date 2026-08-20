-- ============================================================
-- Hall double-booking prevention.
--
-- halls.blocked_dates already existed as a column (migration
-- 20260706070753) but nothing ever wrote to it for hall bookings —
-- only vendors had an auto-sync trigger. So a venue owner could
-- confirm two different customers for the exact same date with
-- nothing stopping them, and the marketplace/booking form had no way
-- to know a date was already taken.
--
-- Fix: when a hall booking (customer_bookings, kind='hall') is
-- CONFIRMED by the venue owner —
--   1. If any date in its [event_date, event_end_date] range is
--      already in halls.blocked_dates, the confirm is REJECTED with a
--      clear error — the venue owner literally cannot double-confirm
--      the same date for two different bookings.
--   2. Otherwise every date in the range is added to
--      halls.blocked_dates, so the marketplace/booking form can now
--      warn the customer immediately, before they even submit.
-- If a confirmed booking later gets cancelled, its dates are freed up
-- again.
-- ============================================================

create or replace function public.tg_hall_booking_sync_blocked_dates()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_day date;
  v_end date;
  v_blocked jsonb;
begin
  if new.kind is distinct from 'hall' or new.target_id is null then
    return new;
  end if;

  -- Booking just got confirmed — check for a clash, then claim the dates.
  if new.status = 'confirmed' and old.status is distinct from 'confirmed' then
    v_end := coalesce(new.event_end_date, new.event_date);
    if new.event_date is null then
      return new;
    end if;

    select blocked_dates into v_blocked from public.halls where id = new.target_id;
    v_day := new.event_date;
    while v_day <= v_end loop
      if v_blocked ? v_day::text then
        raise exception 'This venue is already booked on % — please ask the customer for different dates before confirming.', v_day
          using errcode = '23505';
      end if;
      v_day := v_day + 1;
    end loop;

    v_day := new.event_date;
    while v_day <= v_end loop
      update public.halls set blocked_dates = blocked_dates || jsonb_build_array(v_day::text)
        where id = new.target_id and not (blocked_dates ? v_day::text);
      v_day := v_day + 1;
    end loop;

  -- A previously-confirmed booking is now cancelled — free its dates.
  elsif old.status = 'confirmed' and new.status = 'cancelled' then
    v_end := coalesce(old.event_end_date, old.event_date);
    if old.event_date is null then
      return new;
    end if;
    v_day := old.event_date;
    while v_day <= v_end loop
      update public.halls set blocked_dates = (
        select coalesce(jsonb_agg(elem), '[]'::jsonb) from jsonb_array_elements_text(blocked_dates) elem where elem <> v_day::text
      ) where id = new.target_id;
      v_day := v_day + 1;
    end loop;
  end if;

  return new;
end $$;

drop trigger if exists hall_booking_sync_blocked_dates on public.customer_bookings;
create trigger hall_booking_sync_blocked_dates
  before update on public.customer_bookings
  for each row execute function public.tg_hall_booking_sync_blocked_dates();

-- Also block obviously-invalid data at the source: a booking's start
-- date can't be in the past at the moment it's created. Added as NOT
-- VALID so it doesn't retroactively fail on existing historical rows
-- (test data, or old bookings entered after the fact) — it only
-- enforces on NEW inserts and any UPDATE that touches event_date from
-- here on, which is exactly what we want going forward.
alter table public.customer_bookings drop constraint if exists customer_bookings_not_in_past;
alter table public.customer_bookings add constraint customer_bookings_not_in_past
  check (event_date is null or event_date >= created_at::date) not valid;
