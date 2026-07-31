-- ============================================================
-- Prevent double-booking a Worker, and auto-block/unblock their
-- calendar date when a task is assigned/cancelled.
--
-- Problem: Venue Owners, Customers (and Organizations/Vendors) can all
-- insert into worker_tasks independently (hire-workers.tsx,
-- worker.$id.tsx, org assignment flows, the job-marketplace accept
-- flow). None of those insert paths checked whether the worker already
-- had a task — or a manually-set blocked_dates entry — on that
-- event_date. So the same worker could be hired twice for the same day.
--
-- Fix goes in the database (not each frontend form) so it's enforced
-- no matter which flow creates the row, today or in the future.
-- ============================================================

-- ---- 1) BEFORE INSERT/UPDATE: reject a conflicting booking ----
create or replace function public.tg_worker_task_prevent_conflict()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_blocked jsonb;
  v_conflict_count int;
begin
  -- Only need to check when the row is new, or when event_date is
  -- actually changing (rescheduling an existing task).
  if (tg_op = 'UPDATE') and (new.event_date is not distinct from old.event_date) then
    return new;
  end if;

  -- A cancelled/rejected task never occupies a date.
  if new.status in ('cancelled','rejected') then
    return new;
  end if;

  select blocked_dates into v_blocked from public.workers where id = new.worker_id;
  if v_blocked is not null and v_blocked ? new.event_date::text then
    raise exception 'This worker has marked % as unavailable.', to_char(new.event_date, 'DD Mon YYYY')
      using errcode = 'P0001';
  end if;

  select count(*) into v_conflict_count
  from public.worker_tasks t
  where t.worker_id = new.worker_id
    and t.event_date = new.event_date
    and t.status not in ('cancelled','rejected')
    and t.id is distinct from new.id; -- allow updating the same row

  if v_conflict_count > 0 then
    raise exception 'This worker already has a task assigned on % — pick another date.', to_char(new.event_date, 'DD Mon YYYY')
      using errcode = 'P0001';
  end if;

  return new;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'worker_tasks_prevent_conflict') then
    create trigger worker_tasks_prevent_conflict before insert or update on public.worker_tasks
      for each row execute function public.tg_worker_task_prevent_conflict();
  end if;
end $$;

-- ---- 2) AFTER INSERT/UPDATE/DELETE: keep workers.blocked_dates in sync ----
-- As soon as a task lands on a worker's calendar (any active status),
-- that date is blocked. If the task is later cancelled/rejected (or
-- deleted) and no other active task remains on that date, the date is
-- freed up again automatically.
create or replace function public.tg_worker_task_sync_blocked_dates()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_worker_id uuid;
  v_date date;
  v_still_active boolean;
begin
  if (tg_op = 'DELETE') then
    v_worker_id := old.worker_id; v_date := old.event_date;
  else
    v_worker_id := new.worker_id; v_date := new.event_date;
  end if;

  if (tg_op = 'INSERT') then
    if new.status not in ('cancelled','rejected') then
      update public.workers
        set blocked_dates = blocked_dates || jsonb_build_array(new.event_date::text)
        where id = new.worker_id and not (blocked_dates ? new.event_date::text);
    end if;
    return new;
  end if;

  if (tg_op = 'UPDATE') then
    -- date changed: free the old date (if nothing else needs it), block the new one
    if new.event_date is distinct from old.event_date then
      select exists(
        select 1 from public.worker_tasks
        where worker_id = old.worker_id and event_date = old.event_date
          and status not in ('cancelled','rejected') and id <> old.id
      ) into v_still_active;
      if not v_still_active then
        update public.workers set blocked_dates = (
          select coalesce(jsonb_agg(elem), '[]'::jsonb) from jsonb_array_elements_text(blocked_dates) elem
          where elem <> old.event_date::text
        ) where id = old.worker_id;
      end if;
    end if;

    if new.status not in ('cancelled','rejected') then
      update public.workers
        set blocked_dates = blocked_dates || jsonb_build_array(new.event_date::text)
        where id = new.worker_id and not (blocked_dates ? new.event_date::text);
    elsif old.status is distinct from new.status then
      -- just turned cancelled/rejected: free the date if nothing else needs it
      select exists(
        select 1 from public.worker_tasks
        where worker_id = new.worker_id and event_date = new.event_date
          and status not in ('cancelled','rejected') and id <> new.id
      ) into v_still_active;
      if not v_still_active then
        update public.workers set blocked_dates = (
          select coalesce(jsonb_agg(elem), '[]'::jsonb) from jsonb_array_elements_text(blocked_dates) elem
          where elem <> new.event_date::text
        ) where id = new.worker_id;
      end if;
    end if;
    return new;
  end if;

  if (tg_op = 'DELETE') then
    if old.status not in ('cancelled','rejected') then
      select exists(
        select 1 from public.worker_tasks
        where worker_id = old.worker_id and event_date = old.event_date and status not in ('cancelled','rejected')
      ) into v_still_active;
      if not v_still_active then
        update public.workers set blocked_dates = (
          select coalesce(jsonb_agg(elem), '[]'::jsonb) from jsonb_array_elements_text(blocked_dates) elem
          where elem <> old.event_date::text
        ) where id = old.worker_id;
      end if;
    end if;
    return old;
  end if;

  return null;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'worker_tasks_sync_blocked_ins') then
    create trigger worker_tasks_sync_blocked_ins after insert on public.worker_tasks
      for each row execute function public.tg_worker_task_sync_blocked_dates();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'worker_tasks_sync_blocked_upd') then
    create trigger worker_tasks_sync_blocked_upd after update on public.worker_tasks
      for each row execute function public.tg_worker_task_sync_blocked_dates();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'worker_tasks_sync_blocked_del') then
    create trigger worker_tasks_sync_blocked_del after delete on public.worker_tasks
      for each row execute function public.tg_worker_task_sync_blocked_dates();
  end if;
end $$;
