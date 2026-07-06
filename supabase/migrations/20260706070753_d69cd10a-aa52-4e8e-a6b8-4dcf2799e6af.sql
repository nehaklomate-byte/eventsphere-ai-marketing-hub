
-- ============ ENUMS (safe add) ============
do $$ begin
  create type public.worker_type as enum ('individual','agency');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.verification_status as enum ('unsubmitted','pending','approved','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.task_status as enum ('pending','accepted','in_progress','paused','completed','rejected','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.task_priority as enum ('low','normal','high','urgent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_type as enum ('hourly','daily','per_event','monthly');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_category as enum (
    'task_assigned','task_updated','task_cancelled','task_deadline',
    'task_completed','payment_received','profile_approved','profile_rejected','admin_message','system'
  );
exception when duplicate_object then null; end $$;

-- ============ WORKERS: extend (all nullable/defaults, non-breaking) ============
alter table public.workers
  add column if not exists worker_type public.worker_type not null default 'individual',
  add column if not exists gender text,
  add column if not exists date_of_birth date,
  add column if not exists nationality text default 'Indian',
  add column if not exists bio text,
  add column if not exists preferred_language text default 'en',
  -- agency
  add column if not exists agency_name text,
  add column if not exists agency_logo_url text,
  add column if not exists agency_team_size integer,
  add column if not exists agency_years integer,
  add column if not exists agency_description text,
  add column if not exists agency_services jsonb not null default '[]'::jsonb,
  add column if not exists agency_gst text,
  add column if not exists agency_reg_no text,
  -- location extended
  add column if not exists country text default 'India',
  add column if not exists district text,
  add column if not exists preferred_cities jsonb not null default '[]'::jsonb,
  add column if not exists max_travel_km integer,
  add column if not exists willing_to_travel boolean not null default false,
  add column if not exists working_hours_start text,
  add column if not exists working_hours_end text,
  -- charges
  add column if not exists payment_type public.payment_type default 'daily',
  add column if not exists per_event_charges numeric(10,2),
  add column if not exists monthly_charges numeric(10,2),
  add column if not exists min_booking_price numeric(10,2),
  -- portfolio
  add column if not exists work_images jsonb not null default '[]'::jsonb,
  add column if not exists work_videos jsonb not null default '[]'::jsonb,
  add column if not exists certificates jsonb not null default '[]'::jsonb,
  add column if not exists documents jsonb not null default '[]'::jsonb,
  -- verification
  add column if not exists id_proof_type text,
  add column if not exists id_proof_number text,
  add column if not exists id_proof_url text,
  add column if not exists selfie_url text,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text,
  add column if not exists emergency_contact_relation text,
  add column if not exists verification_status public.verification_status not null default 'unsubmitted',
  add column if not exists verification_notes text,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid,
  -- profile / visibility
  add column if not exists profile_completion smallint not null default 0,
  add column if not exists marketplace_visible boolean not null default false,
  add column if not exists blocked_dates jsonb not null default '[]'::jsonb;

-- unique worker per user (only one worker profile per auth user)
create unique index if not exists workers_owner_id_unique on public.workers(owner_id);

-- Backfill / ensure trigger for updated_at exists on workers
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'workers_set_updated_at') then
    create trigger workers_set_updated_at before update on public.workers
      for each row execute function public.tg_set_updated_at();
  end if;
end $$;

-- ============ WORKER_TASKS ============
create table if not exists public.worker_tasks (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers(id) on delete cascade,
  worker_user_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid not null references auth.users(id) on delete restrict,
  assigner_role public.app_role,
  organization_id uuid references public.organizations(id) on delete set null,
  organization_name text,
  event_name text not null,
  task_name text not null,
  description text,
  venue text,
  venue_address text,
  event_date date not null,
  start_time time,
  end_time time,
  priority public.task_priority not null default 'normal',
  status public.task_status not null default 'pending',
  payment_amount numeric(10,2),
  accepted_at timestamptz,
  started_at timestamptz,
  paused_at timestamptz,
  resumed_at timestamptz,
  completed_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  worker_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.worker_tasks to authenticated;
grant all on public.worker_tasks to service_role;
alter table public.worker_tasks enable row level security;

create index if not exists worker_tasks_worker_id_idx on public.worker_tasks(worker_id);
create index if not exists worker_tasks_worker_user_id_idx on public.worker_tasks(worker_user_id);
create index if not exists worker_tasks_assigned_by_idx on public.worker_tasks(assigned_by);
create index if not exists worker_tasks_event_date_idx on public.worker_tasks(event_date);
create index if not exists worker_tasks_status_idx on public.worker_tasks(status);

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'worker_tasks_set_updated_at') then
    create trigger worker_tasks_set_updated_at before update on public.worker_tasks
      for each row execute function public.tg_set_updated_at();
  end if;
end $$;

-- Policies: worker can read/update only their own tasks; assigner can read/create tasks they assigned; admin all.
drop policy if exists "worker reads own tasks" on public.worker_tasks;
create policy "worker reads own tasks" on public.worker_tasks
  for select to authenticated using (worker_user_id = auth.uid());

drop policy if exists "assigner reads assigned tasks" on public.worker_tasks;
create policy "assigner reads assigned tasks" on public.worker_tasks
  for select to authenticated using (assigned_by = auth.uid());

drop policy if exists "admin reads all tasks" on public.worker_tasks;
create policy "admin reads all tasks" on public.worker_tasks
  for select to authenticated using (public.has_role(auth.uid(),'admin'));

drop policy if exists "assigner creates tasks" on public.worker_tasks;
create policy "assigner creates tasks" on public.worker_tasks
  for insert to authenticated with check (
    assigned_by = auth.uid()
    and (
      public.has_role(auth.uid(),'organization')
      or public.has_role(auth.uid(),'hall_owner')
      or public.has_role(auth.uid(),'vendor')
      or public.has_role(auth.uid(),'admin')
    )
  );

drop policy if exists "worker updates own task status" on public.worker_tasks;
create policy "worker updates own task status" on public.worker_tasks
  for update to authenticated
  using (worker_user_id = auth.uid())
  with check (worker_user_id = auth.uid());

drop policy if exists "assigner updates own tasks" on public.worker_tasks;
create policy "assigner updates own tasks" on public.worker_tasks
  for update to authenticated
  using (assigned_by = auth.uid())
  with check (assigned_by = auth.uid());

-- ============ WORKER_NOTIFICATIONS ============
create table if not exists public.worker_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category public.notification_category not null default 'system',
  title text not null,
  body text,
  action_url text,
  task_id uuid references public.worker_tasks(id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.worker_notifications to authenticated;
grant all on public.worker_notifications to service_role;
alter table public.worker_notifications enable row level security;

create index if not exists worker_notifications_user_id_idx on public.worker_notifications(user_id, created_at desc);
create index if not exists worker_notifications_unread_idx on public.worker_notifications(user_id) where read_at is null;

drop policy if exists "user reads own notifications" on public.worker_notifications;
create policy "user reads own notifications" on public.worker_notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "user updates own notifications" on public.worker_notifications;
create policy "user updates own notifications" on public.worker_notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "user deletes own notifications" on public.worker_notifications;
create policy "user deletes own notifications" on public.worker_notifications
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists "assigner creates notification for worker" on public.worker_notifications;
create policy "assigner creates notification for worker" on public.worker_notifications
  for insert to authenticated with check (
    -- system inserts allow current user OR notifications tied to task the current user assigned
    user_id = auth.uid()
    or exists (
      select 1 from public.worker_tasks t
      where t.id = worker_notifications.task_id and t.assigned_by = auth.uid()
    )
  );

-- ============ Trigger: auto-create notification when task inserted / status updated ============
create or replace function public.tg_worker_task_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_title text; v_body text; v_category public.notification_category;
begin
  if (tg_op = 'INSERT') then
    v_title := 'New task assigned: ' || new.task_name;
    v_body := coalesce(new.organization_name,'') || ' — ' || coalesce(new.venue,'') || ' on ' || to_char(new.event_date,'DD Mon YYYY');
    insert into public.worker_notifications(user_id, category, title, body, task_id, action_url, metadata)
    values (new.worker_user_id, 'task_assigned', v_title, v_body, new.id, '/worker/jobs',
            jsonb_build_object('priority', new.priority, 'event_date', new.event_date));
    return new;
  end if;

  if (tg_op = 'UPDATE') and (new.status is distinct from old.status) then
    v_category := case
      when new.status = 'cancelled' then 'task_cancelled'::public.notification_category
      when new.status = 'completed' then 'task_completed'::public.notification_category
      else 'task_updated'::public.notification_category end;
    -- notify worker if the assigner changed status
    if (auth.uid() is distinct from new.worker_user_id) then
      insert into public.worker_notifications(user_id, category, title, body, task_id, action_url)
      values (new.worker_user_id, v_category, 'Task updated: ' || new.task_name,
              'Status changed to ' || new.status::text, new.id, '/worker/jobs');
    end if;
    -- notify assigner if worker changed status
    if (auth.uid() is distinct from new.assigned_by) then
      insert into public.worker_notifications(user_id, category, title, body, task_id, action_url)
      values (new.assigned_by, v_category, 'Task ' || new.status::text || ': ' || new.task_name,
              'Worker updated status to ' || new.status::text, new.id, null);
    end if;
    return new;
  end if;
  return new;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'worker_tasks_notify_ins') then
    create trigger worker_tasks_notify_ins after insert on public.worker_tasks
      for each row execute function public.tg_worker_task_notify();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'worker_tasks_notify_upd') then
    create trigger worker_tasks_notify_upd after update on public.worker_tasks
      for each row execute function public.tg_worker_task_notify();
  end if;
end $$;
