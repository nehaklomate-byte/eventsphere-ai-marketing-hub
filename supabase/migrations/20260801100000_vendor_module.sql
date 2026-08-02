-- ============================================================
-- Vendor module — mirrors the Worker module end-to-end:
-- vendor_tasks (hire/accept/reject/complete), vendor_notifications,
-- Razorpay payment tracking, double-booking guard + auto-blocked_dates,
-- and vendor_payouts. Same shapes as the worker tables on purpose —
-- the razorpay-create-order / razorpay-verify-payment Edge Functions
-- are being generalized (entity_type param) to serve both instead of
-- duplicating 3 more Edge Functions.
-- ============================================================

alter table public.vendors add column if not exists blocked_dates jsonb not null default '[]'::jsonb;

-- ============ VENDOR_TASKS ============
create table if not exists public.vendor_tasks (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  vendor_user_id uuid not null references auth.users(id) on delete cascade,
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
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid','refunded')),
  razorpay_order_id text,
  razorpay_payment_id text,
  paid_at timestamptz,
  accepted_at timestamptz,
  started_at timestamptz,
  paused_at timestamptz,
  resumed_at timestamptz,
  completed_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  vendor_notes text,
  check_in_photo_url text,
  check_in_lat numeric, check_in_lng numeric, check_in_at timestamptz,
  check_out_photo_url text,
  check_out_lat numeric, check_out_lng numeric, check_out_at timestamptz,
  completion_photo_urls jsonb not null default '[]'::jsonb,
  completion_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.vendor_tasks to authenticated;
grant all on public.vendor_tasks to service_role;
alter table public.vendor_tasks enable row level security;

create index if not exists vendor_tasks_vendor_id_idx on public.vendor_tasks(vendor_id);
create index if not exists vendor_tasks_vendor_user_id_idx on public.vendor_tasks(vendor_user_id);
create index if not exists vendor_tasks_assigned_by_idx on public.vendor_tasks(assigned_by);
create index if not exists vendor_tasks_event_date_idx on public.vendor_tasks(event_date);
create index if not exists vendor_tasks_status_idx on public.vendor_tasks(status);
create index if not exists idx_vendor_tasks_razorpay_order on public.vendor_tasks(razorpay_order_id);

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'vendor_tasks_set_updated_at') then
    create trigger vendor_tasks_set_updated_at before update on public.vendor_tasks
      for each row execute function public.tg_set_updated_at();
  end if;
end $$;

drop policy if exists "vendor reads own tasks" on public.vendor_tasks;
create policy "vendor reads own tasks" on public.vendor_tasks
  for select to authenticated using (vendor_user_id = auth.uid());

drop policy if exists "assigner reads assigned vendor tasks" on public.vendor_tasks;
create policy "assigner reads assigned vendor tasks" on public.vendor_tasks
  for select to authenticated using (assigned_by = auth.uid());

drop policy if exists "admin reads all vendor tasks" on public.vendor_tasks;
create policy "admin reads all vendor tasks" on public.vendor_tasks
  for select to authenticated using (public.has_role(auth.uid(),'admin'));

drop policy if exists "assigner creates vendor tasks" on public.vendor_tasks;
create policy "assigner creates vendor tasks" on public.vendor_tasks
  for insert to authenticated with check (
    assigned_by = auth.uid()
    and (
      public.has_role(auth.uid(),'organization')
      or public.has_role(auth.uid(),'hall_owner')
      or public.has_role(auth.uid(),'customer')
      or public.has_role(auth.uid(),'admin')
    )
  );

drop policy if exists "vendor updates own task status" on public.vendor_tasks;
create policy "vendor updates own task status" on public.vendor_tasks
  for update to authenticated
  using (vendor_user_id = auth.uid())
  with check (vendor_user_id = auth.uid());

drop policy if exists "assigner updates own vendor tasks" on public.vendor_tasks;
create policy "assigner updates own vendor tasks" on public.vendor_tasks
  for update to authenticated
  using (assigned_by = auth.uid())
  with check (assigned_by = auth.uid());

-- ============ VENDOR_NOTIFICATIONS (separate table, same shape as worker_notifications) ============
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

create index if not exists vendor_notifications_user_id_idx on public.vendor_notifications(user_id, created_at desc);
create index if not exists vendor_notifications_unread_idx on public.vendor_notifications(user_id) where read_at is null;

drop policy if exists "user reads own vendor notifications" on public.vendor_notifications;
create policy "user reads own vendor notifications" on public.vendor_notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "user updates own vendor notifications" on public.vendor_notifications;
create policy "user updates own vendor notifications" on public.vendor_notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "user deletes own vendor notifications" on public.vendor_notifications;
create policy "user deletes own vendor notifications" on public.vendor_notifications
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists "assigner creates notification for vendor" on public.vendor_notifications;
create policy "assigner creates notification for vendor" on public.vendor_notifications
  for insert to authenticated with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.vendor_tasks t
      where t.id = vendor_notifications.task_id and t.assigned_by = auth.uid()
    )
  );

create or replace function public.tg_vendor_task_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_title text; v_body text; v_category public.notification_category;
begin
  if (tg_op = 'INSERT') then
    v_title := 'New task assigned: ' || new.task_name;
    v_body := coalesce(new.organization_name,'') || ' — ' || coalesce(new.venue,'') || ' on ' || to_char(new.event_date,'DD Mon YYYY');
    insert into public.vendor_notifications(user_id, category, title, body, task_id, action_url, metadata)
    values (new.vendor_user_id, 'task_assigned', v_title, v_body, new.id, '/vendor/jobs',
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
      values (new.vendor_user_id, v_category, 'Task updated: ' || new.task_name,
              'Status changed to ' || new.status::text, new.id, '/vendor/jobs');
    end if;
    if (auth.uid() is distinct from new.assigned_by) then
      insert into public.vendor_notifications(user_id, category, title, body, task_id, action_url)
      values (new.assigned_by, v_category, 'Task ' || new.status::text || ': ' || new.task_name,
              'Vendor updated status to ' || new.status::text, new.id, null);
    end if;
    return new;
  end if;
  return new;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'vendor_tasks_notify') then
    create trigger vendor_tasks_notify after insert or update on public.vendor_tasks
      for each row execute function public.tg_vendor_task_notify();
  end if;
end $$;

-- ============ Double-booking guard (mirrors worker_tasks_prevent_conflict) ============
create or replace function public.tg_vendor_task_prevent_conflict()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_blocked jsonb;
  v_conflict_count int;
begin
  if (tg_op = 'UPDATE') and (new.event_date is not distinct from old.event_date) then
    return new;
  end if;
  if new.status in ('cancelled','rejected') then
    return new;
  end if;

  select blocked_dates into v_blocked from public.vendors where id = new.vendor_id;
  if v_blocked is not null and v_blocked ? new.event_date::text then
    raise exception 'This vendor has marked % as unavailable.', to_char(new.event_date, 'DD Mon YYYY') using errcode = 'P0001';
  end if;

  select count(*) into v_conflict_count
  from public.vendor_tasks t
  where t.vendor_id = new.vendor_id
    and t.event_date = new.event_date
    and t.status not in ('cancelled','rejected')
    and t.id is distinct from new.id;

  if v_conflict_count > 0 then
    raise exception 'This vendor already has a task assigned on % — pick another date.', to_char(new.event_date, 'DD Mon YYYY') using errcode = 'P0001';
  end if;

  return new;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'vendor_tasks_prevent_conflict') then
    create trigger vendor_tasks_prevent_conflict before insert or update on public.vendor_tasks
      for each row execute function public.tg_vendor_task_prevent_conflict();
  end if;
end $$;

create or replace function public.tg_vendor_task_sync_blocked_dates()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_still_active boolean;
begin
  if (tg_op = 'INSERT') then
    if new.status not in ('cancelled','rejected') then
      update public.vendors set blocked_dates = blocked_dates || jsonb_build_array(new.event_date::text)
        where id = new.vendor_id and not (blocked_dates ? new.event_date::text);
    end if;
    return new;
  end if;

  if (tg_op = 'UPDATE') then
    if new.event_date is distinct from old.event_date then
      select exists(
        select 1 from public.vendor_tasks
        where vendor_id = old.vendor_id and event_date = old.event_date
          and status not in ('cancelled','rejected') and id <> old.id
      ) into v_still_active;
      if not v_still_active then
        update public.vendors set blocked_dates = (
          select coalesce(jsonb_agg(elem), '[]'::jsonb) from jsonb_array_elements_text(blocked_dates) elem
          where elem <> old.event_date::text
        ) where id = old.vendor_id;
      end if;
    end if;

    if new.status not in ('cancelled','rejected') then
      update public.vendors set blocked_dates = blocked_dates || jsonb_build_array(new.event_date::text)
        where id = new.vendor_id and not (blocked_dates ? new.event_date::text);
    elsif old.status is distinct from new.status then
      select exists(
        select 1 from public.vendor_tasks
        where vendor_id = new.vendor_id and event_date = new.event_date
          and status not in ('cancelled','rejected') and id <> new.id
      ) into v_still_active;
      if not v_still_active then
        update public.vendors set blocked_dates = (
          select coalesce(jsonb_agg(elem), '[]'::jsonb) from jsonb_array_elements_text(blocked_dates) elem
          where elem <> new.event_date::text
        ) where id = new.vendor_id;
      end if;
    end if;
    return new;
  end if;

  if (tg_op = 'DELETE') then
    if old.status not in ('cancelled','rejected') then
      select exists(
        select 1 from public.vendor_tasks
        where vendor_id = old.vendor_id and event_date = old.event_date and status not in ('cancelled','rejected')
      ) into v_still_active;
      if not v_still_active then
        update public.vendors set blocked_dates = (
          select coalesce(jsonb_agg(elem), '[]'::jsonb) from jsonb_array_elements_text(blocked_dates) elem
          where elem <> old.event_date::text
        ) where id = old.vendor_id;
      end if;
    end if;
    return old;
  end if;

  return null;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'vendor_tasks_sync_blocked_ins') then
    create trigger vendor_tasks_sync_blocked_ins after insert on public.vendor_tasks
      for each row execute function public.tg_vendor_task_sync_blocked_dates();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'vendor_tasks_sync_blocked_upd') then
    create trigger vendor_tasks_sync_blocked_upd after update on public.vendor_tasks
      for each row execute function public.tg_vendor_task_sync_blocked_dates();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'vendor_tasks_sync_blocked_del') then
    create trigger vendor_tasks_sync_blocked_del after delete on public.vendor_tasks
      for each row execute function public.tg_vendor_task_sync_blocked_dates();
  end if;
end $$;

-- ============ VENDOR_PAYOUTS (mirrors worker_payouts) ============
create table if not exists public.vendor_payouts (
  id uuid primary key default gen_random_uuid(),
  vendor_task_id uuid not null references public.vendor_tasks(id) on delete cascade unique,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  amount numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending','paid')),
  payout_reference text,
  paid_by uuid references auth.users(id),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.vendor_payouts enable row level security;

drop policy if exists "assigner can view vendor payout" on public.vendor_payouts;
create policy "assigner can view vendor payout" on public.vendor_payouts
  for select using (
    exists (select 1 from public.vendor_tasks t where t.id = vendor_task_id and t.assigned_by = auth.uid())
  );

drop policy if exists "vendor can view own payout" on public.vendor_payouts;
create policy "vendor can view own payout" on public.vendor_payouts
  for select using (
    exists (select 1 from public.vendors v where v.id = vendor_id and v.owner_id = auth.uid())
  );

drop policy if exists "assigner can update vendor payout" on public.vendor_payouts;
create policy "assigner can update vendor payout" on public.vendor_payouts
  for update using (
    exists (select 1 from public.vendor_tasks t where t.id = vendor_task_id and t.assigned_by = auth.uid())
  );

create or replace function public.tg_vendor_task_create_payout()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.payment_status = 'paid' and old.payment_status is distinct from 'paid' then
    insert into public.vendor_payouts (vendor_task_id, vendor_id, amount)
    values (new.id, new.vendor_id, coalesce(new.payment_amount, 0))
    on conflict (vendor_task_id) do nothing;
  end if;
  return new;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'vendor_tasks_create_payout') then
    create trigger vendor_tasks_create_payout after update on public.vendor_tasks
      for each row execute function public.tg_vendor_task_create_payout();
  end if;
end $$;
