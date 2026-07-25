-- ============================================================
-- Worker Module — Photo-Proof Attendance
--
-- Extends the existing public.worker_tasks table (no new tables,
-- no touching auth/roles/other modules). Adds:
--   - Check-in (attendance start) with a required photo + optional GPS
--   - Check-out (attendance end) with a required photo + optional GPS
--   - Mandatory work-proof photo(s) before a task can be marked completed
--
-- A DB-level trigger enforces the photo requirement so it can never be
-- bypassed by a UI bug or a direct API call — this is the platform's
-- core differentiator per the product spec, so it's guarded at the
-- data layer, not just in the React form.
-- Reuses the existing public "worker-media" storage bucket — no new
-- bucket or storage policy needed.
-- ============================================================

alter table public.worker_tasks
  add column if not exists check_in_at timestamptz,
  add column if not exists check_in_photo_url text,
  add column if not exists check_in_lat numeric,
  add column if not exists check_in_lng numeric,
  add column if not exists check_out_at timestamptz,
  add column if not exists check_out_photo_url text,
  add column if not exists check_out_lat numeric,
  add column if not exists check_out_lng numeric,
  add column if not exists completion_photo_urls jsonb not null default '[]'::jsonb,
  add column if not exists completion_notes text;

create or replace function public.tg_worker_task_attendance_guard()
returns trigger language plpgsql as $$
begin
  -- Starting work (first transition into in_progress) requires a check-in photo.
  if new.status = 'in_progress' and old.status is distinct from 'in_progress' and old.check_in_at is null then
    if new.check_in_photo_url is null or length(trim(new.check_in_photo_url)) = 0 then
      raise exception 'A check-in photo is required before starting work.';
    end if;
    if new.check_in_at is null then
      new.check_in_at := now();
    end if;
  end if;

  -- Completing a task requires a check-out photo AND at least one work-proof photo.
  if new.status = 'completed' and old.status is distinct from 'completed' then
    if new.check_out_photo_url is null or length(trim(new.check_out_photo_url)) = 0 then
      raise exception 'A check-out photo is required to complete this task.';
    end if;
    if coalesce(jsonb_array_length(new.completion_photo_urls), 0) < 1 then
      raise exception 'At least one work-proof photo is required to complete this task.';
    end if;
    if new.check_out_at is null then
      new.check_out_at := now();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists worker_task_attendance_guard on public.worker_tasks;
create trigger worker_task_attendance_guard before update on public.worker_tasks
  for each row execute function public.tg_worker_task_attendance_guard();
