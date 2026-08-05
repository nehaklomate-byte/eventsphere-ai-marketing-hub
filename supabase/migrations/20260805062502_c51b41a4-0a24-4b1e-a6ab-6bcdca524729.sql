-- ============ account settings (notify prefs + deactivation) ============
alter table public.profiles add column if not exists notify_new_task boolean not null default true;
alter table public.profiles add column if not exists notify_status_updates boolean not null default true;

create table if not exists public.account_deactivation_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  status text not null default 'pending' check (status in ('pending','processed')),
  requested_at timestamptz not null default now()
);
grant select, insert on public.account_deactivation_requests to authenticated;
grant all on public.account_deactivation_requests to service_role;
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

-- ============ universal account settings ============
alter table public.profiles
  add column if not exists username text unique,
  add column if not exists date_of_birth date,
  add column if not exists gender text,
  add column if not exists language_preference text not null default 'en',
  add column if not exists timezone text not null default 'Asia/Kolkata',
  add column if not exists preferences jsonb not null default '{
    "theme": "system",
    "font_size": "normal",
    "compact_view": false,
    "privacy": {
      "public_profile": true,
      "show_mobile": false,
      "show_email": false,
      "allow_direct_chat": true,
      "allow_direct_calls": false,
      "search_visible": true,
      "hide_last_active": false
    },
    "notify": {
      "push":  { "new_booking": true, "new_hire_request": true, "booking_confirmed": true, "booking_cancelled": true, "payment_received": true, "new_message": true, "task_assigned": true, "task_completed": true, "review_received": true, "event_reminder": true, "admin": true },
      "email": { "new_booking": true, "new_hire_request": true, "booking_confirmed": true, "booking_cancelled": true, "payment_received": true, "new_message": false, "task_assigned": true, "task_completed": false, "review_received": true, "event_reminder": true, "admin": true },
      "sms":   { "new_booking": false, "new_hire_request": false, "booking_confirmed": true, "booking_cancelled": true, "payment_received": true, "new_message": false, "task_assigned": false, "task_completed": false, "review_received": false, "event_reminder": true, "admin": false }
    }
  }'::jsonb;

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  status text not null default 'pending' check (status in ('pending','cancelled','completed')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (user_id, status)
);
grant select, insert, update on public.account_deletion_requests to authenticated;
grant all on public.account_deletion_requests to service_role;
alter table public.account_deletion_requests enable row level security;
drop policy if exists "user manages own deletion request" on public.account_deletion_requests;
create policy "user manages own deletion request" on public.account_deletion_requests
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "admin reads all deletion requests" on public.account_deletion_requests;
create policy "admin reads all deletion requests" on public.account_deletion_requests
  for select to authenticated using (public.has_role(auth.uid(),'admin'));
drop policy if exists "admin updates deletion requests" on public.account_deletion_requests;
create policy "admin updates deletion requests" on public.account_deletion_requests
  for update to authenticated using (public.has_role(auth.uid(),'admin'));

-- ============ event linking ============
alter table public.customer_bookings add column if not exists customer_event_id uuid references public.customer_events(id) on delete set null;
alter table public.worker_tasks add column if not exists customer_event_id uuid references public.customer_events(id) on delete set null;
alter table public.vendor_tasks add column if not exists customer_event_id uuid references public.customer_events(id) on delete set null;
create index if not exists customer_bookings_event_idx on public.customer_bookings(customer_event_id);
create index if not exists worker_tasks_customer_event_idx on public.worker_tasks(customer_event_id);
create index if not exists vendor_tasks_customer_event_idx on public.vendor_tasks(customer_event_id);

-- ============ new: reschedule / enquiry replies / vendor team pricing ============
alter table public.customer_bookings add column if not exists requested_event_date date;
alter table public.enquiries add column if not exists owner_reply text;
alter table public.enquiries add column if not exists replied_at timestamptz;
alter table public.vendors add column if not exists team_size integer;
alter table public.vendors add column if not exists pricing_mode text check (pricing_mode in ('individual','team'));
alter table public.vendors add column if not exists base_price numeric;
alter table public.workers add column if not exists team_size integer;

-- ============ messaging ============
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  context_type text not null check (context_type in ('hall_enquiry','vendor_enquiry','worker_enquiry','worker_task','vendor_task','customer_booking')),
  context_id uuid not null,
  subject text,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  unique (context_type, context_id)
);
grant select, insert, update on public.conversations to authenticated;
grant all on public.conversations to service_role;
alter table public.conversations enable row level security;

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_label text,
  last_read_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
grant select, insert, update on public.conversation_participants to authenticated;
grant all on public.conversation_participants to service_role;
alter table public.conversation_participants enable row level security;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;

create index if not exists conversation_participants_user_idx on public.conversation_participants(user_id);
create index if not exists messages_conversation_idx on public.messages(conversation_id, created_at);

create or replace function public.is_conversation_participant(p_conversation_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.conversation_participants where conversation_id = p_conversation_id and user_id = p_user_id);
$$;

drop policy if exists "participants read conversation" on public.conversations;
create policy "participants read conversation" on public.conversations
  for select to authenticated using (public.is_conversation_participant(id, auth.uid()));
drop policy if exists "participants read participant list" on public.conversation_participants;
create policy "participants read participant list" on public.conversation_participants
  for select to authenticated using (public.is_conversation_participant(conversation_id, auth.uid()));
drop policy if exists "participant updates own read marker" on public.conversation_participants;
create policy "participant updates own read marker" on public.conversation_participants
  for update to authenticated using (user_id = auth.uid());
drop policy if exists "participants read messages" on public.messages;
create policy "participants read messages" on public.messages
  for select to authenticated using (public.is_conversation_participant(conversation_id, auth.uid()));
drop policy if exists "participants send messages" on public.messages;
create policy "participants send messages" on public.messages
  for insert to authenticated with check (sender_id = auth.uid() and public.is_conversation_participant(conversation_id, auth.uid()));

create or replace function public.tg_bump_conversation_last_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end $$;
drop trigger if exists bump_conversation_last_message on public.messages;
create trigger bump_conversation_last_message after insert on public.messages
  for each row execute function public.tg_bump_conversation_last_message();

create or replace function public.get_or_create_conversation(
  p_context_type text, p_context_id uuid, p_subject text,
  p_user_a uuid, p_role_a text, p_user_b uuid, p_role_b text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  select id into v_id from public.conversations where context_type = p_context_type and context_id = p_context_id;
  if v_id is not null then return v_id; end if;
  insert into public.conversations (context_type, context_id, subject) values (p_context_type, p_context_id, p_subject) returning id into v_id;
  if p_user_a is not null then
    insert into public.conversation_participants (conversation_id, user_id, role_label) values (v_id, p_user_a, p_role_a) on conflict do nothing;
  end if;
  if p_user_b is not null then
    insert into public.conversation_participants (conversation_id, user_id, role_label) values (v_id, p_user_b, p_role_b) on conflict do nothing;
  end if;
  return v_id;
end $$;
grant execute on function public.get_or_create_conversation(text, uuid, text, uuid, text, uuid, text) to authenticated;

create or replace function public.tg_enquiry_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_ctype text; v_subject text;
begin
  if new.requester_id is null then return new; end if;
  if new.hall_id is not null then
    select owner_id, 'hall_enquiry', name into v_owner, v_ctype, v_subject from public.halls where id = new.hall_id;
  elsif new.vendor_id is not null then
    select owner_id, 'vendor_enquiry', business_name into v_owner, v_ctype, v_subject from public.vendors where id = new.vendor_id;
  elsif new.worker_id is not null then
    select owner_id, 'worker_enquiry', full_name into v_owner, v_ctype, v_subject from public.workers where id = new.worker_id;
  else
    return new;
  end if;
  if v_owner is null then return new; end if;
  perform public.get_or_create_conversation(v_ctype, new.id, v_subject, new.requester_id, 'customer', v_owner, 'owner');
  return new;
end $$;
drop trigger if exists enquiry_conversation on public.enquiries;
create trigger enquiry_conversation after insert on public.enquiries
  for each row execute function public.tg_enquiry_conversation();

create or replace function public.tg_worker_task_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.get_or_create_conversation('worker_task', new.id, new.task_name, new.assigned_by, 'assigner', new.worker_user_id, 'worker');
  return new;
end $$;
drop trigger if exists worker_task_conversation on public.worker_tasks;
create trigger worker_task_conversation after insert on public.worker_tasks
  for each row execute function public.tg_worker_task_conversation();

create or replace function public.tg_vendor_task_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.get_or_create_conversation('vendor_task', new.id, new.task_name, new.assigned_by, 'assigner', new.vendor_user_id, 'vendor');
  return new;
end $$;
drop trigger if exists vendor_task_conversation on public.vendor_tasks;
create trigger vendor_task_conversation after insert on public.vendor_tasks
  for each row execute function public.tg_vendor_task_conversation();

create or replace function public.tg_customer_booking_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  if new.target_id is null then return new; end if;
  if new.kind = 'hall' then select owner_id into v_owner from public.halls where id = new.target_id;
  elsif new.kind = 'vendor' then select owner_id into v_owner from public.vendors where id = new.target_id;
  elsif new.kind = 'worker' then select owner_id into v_owner from public.workers where id = new.target_id;
  end if;
  if v_owner is null then return new; end if;
  perform public.get_or_create_conversation('customer_booking', new.id, new.target_name, new.user_id, 'customer', v_owner, 'owner');
  return new;
end $$;
drop trigger if exists customer_booking_conversation on public.customer_bookings;
create trigger customer_booking_conversation after insert on public.customer_bookings
  for each row execute function public.tg_customer_booking_conversation();

do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;