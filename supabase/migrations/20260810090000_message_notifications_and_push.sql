-- ============================================================
-- 0) Both notification-category enums need a "message" value —
--    neither had one, which is exactly why a chat message could
--    never be filed as a real notification before.
-- ============================================================
alter type public.notification_category add value if not exists 'message';
alter type public.customer_notification_kind add value if not exists 'message';

-- ============================================================
-- 1) A chat message never generated any notification at all —
--    the bell, badge and notification list stayed silent even
--    when someone had an unread message, and there was no push
--    notification either. This adds an in-app notification the
--    moment a message is sent, routed to whichever table that
--    recipient's dashboard actually reads (see notify-per-role
--    mapping used elsewhere in the app).
-- ============================================================

create or replace function public.notify_new_message() returns trigger as $$
declare
  v_participant record;
  v_sender_name text;
  v_preview text;
  v_role text;
begin
  select coalesce(full_name, business_name, email, 'Someone') into v_sender_name
  from public.profiles where id = new.sender_id;

  v_preview := left(coalesce(new.body, ''), 120);

  for v_participant in
    select cp.user_id, p.primary_role
    from public.conversation_participants cp
    join public.profiles p on p.id = cp.user_id
    where cp.conversation_id = new.conversation_id
      and cp.user_id is distinct from new.sender_id
  loop
    v_role := v_participant.primary_role;

    if v_role = 'worker' then
      insert into public.worker_notifications (user_id, category, title, body, action_url)
      values (v_participant.user_id, 'message', 'New message from ' || v_sender_name, v_preview, '/worker/messages');
    elsif v_role = 'vendor' then
      insert into public.vendor_notifications (user_id, category, title, body, action_url)
      values (v_participant.user_id, 'message', 'New message from ' || v_sender_name, v_preview, '/vendor/messages');
    elsif v_role = 'customer' then
      insert into public.customer_notifications (user_id, kind, title, body, action_url)
      values (v_participant.user_id, 'message', 'New message from ' || v_sender_name, v_preview, '/customer/messages');
    else
      -- venue owners, organizations, admins all read platform_notifications
      insert into public.platform_notifications (user_id, title, body, type)
      values (v_participant.user_id, 'New message from ' || v_sender_name, v_preview, 'info');
    end if;
  end loop;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_message_notify on public.messages;
create trigger on_message_notify after insert on public.messages
  for each row execute function public.notify_new_message();

-- ============================================================
-- 2) Web push subscriptions — lets the browser/phone show a real
--    notification even when the app/tab is closed. One row per
--    device the person has enabled notifications on.
-- ============================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "user manages own push subscriptions" on public.push_subscriptions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "service role reads push subscriptions" on public.push_subscriptions
  for select to service_role using (true);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
