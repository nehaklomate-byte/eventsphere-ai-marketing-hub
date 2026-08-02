-- ============================================================
-- Proper account settings, shared across every role: notification
-- preferences (checked by the notify triggers before inserting a
-- row) and a lightweight account-deactivation request flow.
-- ============================================================

alter table public.profiles add column if not exists notify_new_task boolean not null default true;
alter table public.profiles add column if not exists notify_status_updates boolean not null default true;

create table if not exists public.account_deactivation_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  status text not null default 'pending' check (status in ('pending','processed')),
  requested_at timestamptz not null default now()
);

alter table public.account_deactivation_requests enable row level security;

drop policy if exists "user creates own deactivation request" on public.account_deactivation_requests;
create policy "user creates own deactivation request" on public.account_deactivation_requests
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "user views own deactivation request" on public.account_deactivation_requests;
create policy "user views own deactivation request" on public.account_deactivation_requests
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "admin views all deactivation requests" on public.account_deactivation_requests;
create policy "admin views all deactivation requests" on public.account_deactivation_requests
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- ---- Worker notify trigger: respect the recipient's preference ----
create or replace function public.tg_worker_task_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_title text; v_body text; v_category public.notification_category;
  v_recipient_wants_it boolean;
begin
  if (tg_op = 'INSERT') then
    select notify_new_task into v_recipient_wants_it from public.profiles where id = new.worker_user_id;
    if coalesce(v_recipient_wants_it, true) then
      v_title := 'New task assigned: ' || new.task_name;
      v_body := coalesce(new.organization_name,'') || ' — ' || coalesce(new.venue,'') || ' on ' || to_char(new.event_date,'DD Mon YYYY');
      insert into public.worker_notifications(user_id, category, title, body, task_id, action_url, metadata)
      values (new.worker_user_id, 'task_assigned', v_title, v_body, new.id, '/worker/jobs',
              jsonb_build_object('priority', new.priority, 'event_date', new.event_date));
    end if;
    return new;
  end if;

  if (tg_op = 'UPDATE') and (new.status is distinct from old.status) then
    v_category := case
      when new.status = 'cancelled' then 'task_cancelled'::public.notification_category
      when new.status = 'completed' then 'task_completed'::public.notification_category
      else 'task_updated'::public.notification_category end;

    if (auth.uid() is distinct from new.worker_user_id) then
      select notify_status_updates into v_recipient_wants_it from public.profiles where id = new.worker_user_id;
      if coalesce(v_recipient_wants_it, true) then
        insert into public.worker_notifications(user_id, category, title, body, task_id, action_url)
        values (new.worker_user_id, v_category, 'Task updated: ' || new.task_name,
                'Status changed to ' || new.status::text, new.id, '/worker/jobs');
      end if;
    end if;

    if (auth.uid() is distinct from new.assigned_by) then
      select notify_status_updates into v_recipient_wants_it from public.profiles where id = new.assigned_by;
      if coalesce(v_recipient_wants_it, true) then
        insert into public.worker_notifications(user_id, category, title, body, task_id, action_url)
        values (new.assigned_by, v_category, 'Task ' || new.status::text || ': ' || new.task_name,
                'Worker updated status to ' || new.status::text, new.id, null);
      end if;
    end if;
    return new;
  end if;
  return new;
end $$;

-- ---- Vendor notify trigger: same preference check ----
create or replace function public.tg_vendor_task_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_title text; v_body text; v_category public.notification_category;
  v_recipient_wants_it boolean;
begin
  if (tg_op = 'INSERT') then
    select notify_new_task into v_recipient_wants_it from public.profiles where id = new.vendor_user_id;
    if coalesce(v_recipient_wants_it, true) then
      v_title := 'New task assigned: ' || new.task_name;
      v_body := coalesce(new.organization_name,'') || ' — ' || coalesce(new.venue,'') || ' on ' || to_char(new.event_date,'DD Mon YYYY');
      insert into public.vendor_notifications(user_id, category, title, body, task_id, action_url, metadata)
      values (new.vendor_user_id, 'task_assigned', v_title, v_body, new.id, '/vendor/jobs',
              jsonb_build_object('priority', new.priority, 'event_date', new.event_date));
    end if;
    return new;
  end if;

  if (tg_op = 'UPDATE') and (new.status is distinct from old.status) then
    v_category := case
      when new.status = 'cancelled' then 'task_cancelled'::public.notification_category
      when new.status = 'completed' then 'task_completed'::public.notification_category
      else 'task_updated'::public.notification_category end;

    if (auth.uid() is distinct from new.vendor_user_id) then
      select notify_status_updates into v_recipient_wants_it from public.profiles where id = new.vendor_user_id;
      if coalesce(v_recipient_wants_it, true) then
        insert into public.vendor_notifications(user_id, category, title, body, task_id, action_url)
        values (new.vendor_user_id, v_category, 'Task updated: ' || new.task_name,
                'Status changed to ' || new.status::text, new.id, '/vendor/jobs');
      end if;
    end if;

    if (auth.uid() is distinct from new.assigned_by) then
      select notify_status_updates into v_recipient_wants_it from public.profiles where id = new.assigned_by;
      if coalesce(v_recipient_wants_it, true) then
        insert into public.vendor_notifications(user_id, category, title, body, task_id, action_url)
        values (new.assigned_by, v_category, 'Task ' || new.status::text || ': ' || new.task_name,
                'Vendor updated status to ' || new.status::text, new.id, null);
      end if;
    end if;
    return new;
  end if;
  return new;
end $$;
