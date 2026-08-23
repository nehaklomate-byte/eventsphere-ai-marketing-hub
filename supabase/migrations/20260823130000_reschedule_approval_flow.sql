-- ============================================================
-- A customer's reschedule request (customer/bookings.tsx sets
-- status='reschedule_requested' + requested_event_date) had NOTHING
-- on the venue side that ever read requested_event_date — no accept/
-- decline action existed anywhere in the app. The request just sat
-- there forever with a badge shown, but nothing to action it, so the
-- booking's actual event_date never changed. src/lib/venue.ts now
-- ships resolveRescheduleRequest() for this — this migration extends
-- the blocked-dates guard (20260819140000) to handle the transition
-- that function introduces: 'reschedule_requested' -> 'confirmed'.
--
-- Without this, accepting a reschedule would leave the booking's
-- ORIGINAL date permanently stuck in halls.blocked_dates (nothing
-- ever frees it), blocking that date for every future customer even
-- though this booking doesn't use it anymore.
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

  -- Booking confirmed for the first time (not coming from a reschedule
  -- request — that's the next branch) — check for a clash, then claim.
  if new.status = 'confirmed' and old.status not in ('confirmed', 'reschedule_requested') then
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

  -- A reschedule request was accepted AND the date actually changed
  -- (declining, or accepting a request for the same date, leaves
  -- event_date untouched, so this is skipped for those) — free the
  -- old date range, clash-check the new one, then claim it.
  elsif old.status = 'reschedule_requested' and new.status = 'confirmed'
        and new.event_date is distinct from old.event_date then
    if old.event_date is not null then
      v_end := coalesce(old.event_end_date, old.event_date);
      v_day := old.event_date;
      while v_day <= v_end loop
        update public.halls set blocked_dates = (
          select coalesce(jsonb_agg(elem), '[]'::jsonb) from jsonb_array_elements_text(blocked_dates) elem where elem <> v_day::text
        ) where id = new.target_id;
        v_day := v_day + 1;
      end loop;
    end if;

    if new.event_date is not null then
      v_end := coalesce(new.event_end_date, new.event_date);
      select blocked_dates into v_blocked from public.halls where id = new.target_id;
      v_day := new.event_date;
      while v_day <= v_end loop
        if v_blocked ? v_day::text then
          raise exception 'This venue is already booked on % — please pick a different date.', v_day
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
    end if;

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
