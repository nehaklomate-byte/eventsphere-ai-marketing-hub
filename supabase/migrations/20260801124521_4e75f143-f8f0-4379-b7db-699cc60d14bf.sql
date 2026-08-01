-- 1. Vendor profile: missing columns the app already expects
alter table public.vendors
  add column if not exists verification_status public.verification_status not null default 'unsubmitted',
  add column if not exists rejection_reason text,
  add column if not exists documents jsonb not null default '[]'::jsonb,
  add column if not exists marketplace_visible boolean not null default true,
  add column if not exists blocked_dates jsonb not null default '[]'::jsonb,
  add column if not exists working_hours_start text,
  add column if not exists working_hours_end text,
  add column if not exists willing_to_travel boolean not null default true,
  add column if not exists max_travel_km integer,
  add column if not exists profile_completion smallint not null default 0;

-- 2. Worker tasks: missing columns the app already expects
alter table public.worker_tasks
  add column if not exists payment_status text not null default 'unpaid',
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

-- 3. Vendor tasks (booking requests sent to one specific vendor)
create table if not exists public.vendor_tasks (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  vendor_user_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid not null references auth.users(id) on delete cascade,
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
  payment_amount numeric,
  payment_status text not null default 'unpaid',
  accepted_at timestamptz,
  started_at timestamptz,
  paused_at timestamptz,
  resumed_at timestamptz,
  completed_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  vendor_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.vendor_tasks to authenticated;
grant all on public.vendor_tasks to service_role;

alter table public.vendor_tasks enable row level security;

drop policy if exists "vendor reads own tasks" on public.vendor_tasks;
create policy "vendor reads own tasks" on public.vendor_tasks for select to authenticated
  using (vendor_user_id = auth.uid());

drop policy if exists "assigner reads vendor tasks" on public.vendor_tasks;
create policy "assigner reads vendor tasks" on public.vendor_tasks for select to authenticated
  using (assigned_by = auth.uid());

drop policy if exists "admin reads all vendor tasks" on public.vendor_tasks;
create policy "admin reads all vendor tasks" on public.vendor_tasks for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "assigner creates vendor tasks" on public.vendor_tasks;
create policy "assigner creates vendor tasks" on public.vendor_tasks for insert to authenticated
  with check (assigned_by = auth.uid() and (
    public.has_role(auth.uid(), 'organization') or public.has_role(auth.uid(), 'hall_owner')
    or public.has_role(auth.uid(), 'vendor') or public.has_role(auth.uid(), 'customer')
    or public.has_role(auth.uid(), 'admin')));

drop policy if exists "vendor updates own task status" on public.vendor_tasks;
create policy "vendor updates own task status" on public.vendor_tasks for update to authenticated
  using (vendor_user_id = auth.uid()) with check (vendor_user_id = auth.uid());

drop policy if exists "assigner updates own vendor tasks" on public.vendor_tasks;
create policy "assigner updates own vendor tasks" on public.vendor_tasks for update to authenticated
  using (assigned_by = auth.uid()) with check (assigned_by = auth.uid());

drop trigger if exists set_updated_at on public.vendor_tasks;
create trigger set_updated_at before update on public.vendor_tasks
  for each row execute function public.tg_set_updated_at();

create index if not exists vendor_tasks_vendor_user_idx on public.vendor_tasks(vendor_user_id, event_date desc);
create index if not exists vendor_tasks_assigned_by_idx on public.vendor_tasks(assigned_by, event_date desc);

-- 4. Vendor notifications
create table if not exists public.vendor_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category public.notification_category not null default 'system',
  title text not null,
  body text,
  action_url text,
  task_id uuid references public.vendor_tasks(id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.vendor_notifications to authenticated;
grant all on public.vendor_notifications to service_role;

alter table public.vendor_notifications enable row level security;

drop policy if exists "user reads own vendor notifications" on public.vendor_notifications;
create policy "user reads own vendor notifications" on public.vendor_notifications for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "user updates own vendor notifications" on public.vendor_notifications;
create policy "user updates own vendor notifications" on public.vendor_notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "user deletes own vendor notifications" on public.vendor_notifications;
create policy "user deletes own vendor notifications" on public.vendor_notifications for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "assigner creates vendor notification" on public.vendor_notifications;
create policy "assigner creates vendor notification" on public.vendor_notifications for insert to authenticated
  with check (user_id = auth.uid() or exists (
    select 1 from public.vendor_tasks t where t.id = vendor_notifications.task_id and t.assigned_by = auth.uid()));

create index if not exists vendor_notifications_user_idx on public.vendor_notifications(user_id, created_at desc);

-- 5. Auto-notify on vendor task assignment / status change
create or replace function public.tg_vendor_task_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category public.notification_category;
begin
  if (tg_op = 'INSERT') then
    insert into public.vendor_notifications(user_id, category, title, body, task_id, action_url, metadata)
    values (new.vendor_user_id, 'task_assigned', 'New booking request: ' || new.task_name,
            coalesce(new.organization_name,'') || ' — ' || coalesce(new.venue,'') || ' on ' || to_char(new.event_date,'DD Mon YYYY'),
            new.id, '/vendor/jobs',
            jsonb_build_object('priority', new.priority, 'event_date', new.event_date));
    return new;
  end if;

  if (tg_op = 'UPDATE') and (new.status is distinct from old.status) then
    v_category := case
      when new.status = 'cancelled' then 'task_cancelled'::public.notification_category
      when new.status = 'completed' then 'task_completed'::public.notification_category
      else 'task_updated'::public.notification_category end;
    if (auth.uid() is distinct from new.vendor_user_id) then
      insert into public.vendor_notifications(user_id, category, title, body, task_id, action_url)
      values (new.vendor_user_id, v_category, 'Booking updated: ' || new.task_name,
              'Status changed to ' || new.status::text, new.id, '/vendor/jobs');
    end if;
    if (auth.uid() is distinct from new.assigned_by) then
      insert into public.vendor_notifications(user_id, category, title, body, task_id, action_url)
      values (new.assigned_by, v_category, 'Vendor booking ' || new.status::text || ': ' || new.task_name,
              'The vendor updated the status to ' || new.status::text, new.id, null);
    end if;
    return new;
  end if;
  return new;
end $$;

drop trigger if exists vendor_task_notify on public.vendor_tasks;
create trigger vendor_task_notify after insert or update on public.vendor_tasks
  for each row execute function public.tg_vendor_task_notify();

-- 6. Ensure the worker task notify trigger is actually attached (it was defined but not bound)
drop trigger if exists worker_task_notify on public.worker_tasks;
create trigger worker_task_notify after insert or update on public.worker_tasks
  for each row execute function public.tg_worker_task_notify();

drop trigger if exists set_updated_at on public.worker_tasks;
create trigger set_updated_at before update on public.worker_tasks
  for each row execute function public.tg_set_updated_at();

alter publication supabase_realtime add table public.vendor_notifications;