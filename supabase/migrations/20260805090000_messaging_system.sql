-- ============================================================
-- Cross-Role Messaging System
--
-- One generic system instead of a separate chat table per relationship —
-- works for Customer<->Venue, Customer<->Vendor, Customer<->Worker,
-- Venue<->Vendor, Venue<->Worker, and anything added later. A
-- conversation is auto-created the moment a real relationship forms
-- (an enquiry with a logged-in requester, a worker/vendor task, or a
-- customer booking) — no manual "start chat" step needed, and no
-- duplicate conversations for the same booking/task/enquiry.
-- ============================================================

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

-- ---------- RLS: only participants can see/use a conversation ----------
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

-- Bump last_message_at whenever a message lands, so conversation lists sort correctly.
create or replace function public.tg_bump_conversation_last_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end $$;
drop trigger if exists bump_conversation_last_message on public.messages;
create trigger bump_conversation_last_message after insert on public.messages
  for each row execute function public.tg_bump_conversation_last_message();

-- ---------- Core helper: get-or-create a conversation between two people ----------
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

-- ---------- Auto-create a conversation whenever a real relationship forms ----------

-- Enquiries: only when a logged-in user sent it (anonymous enquiries have
-- no user_id on one side, so there's nobody on the platform to chat with
-- until they register).
create or replace function public.tg_enquiry_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_ctype text; v_subject text;
begin
  if new.requester_id is null then return new; end if;

  if new.hall_id is not null then
    select owner_id into v_owner from public.halls where id = new.hall_id;
    select 'hall_enquiry', name into v_ctype, v_subject from public.halls where id = new.hall_id;
  elsif new.vendor_id is not null then
    select owner_id into v_owner from public.vendors where id = new.vendor_id;
    select 'vendor_enquiry', business_name into v_ctype, v_subject from public.vendors where id = new.vendor_id;
  elsif new.worker_id is not null then
    select owner_id into v_owner from public.workers where id = new.worker_id;
    select 'worker_enquiry', full_name into v_ctype, v_subject from public.workers where id = new.worker_id;
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

-- Worker tasks: assigner (customer / venue owner / vendor / organization) <-> worker.
create or replace function public.tg_worker_task_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.get_or_create_conversation('worker_task', new.id, new.task_name, new.assigned_by, 'assigner', new.worker_user_id, 'worker');
  return new;
end $$;
drop trigger if exists worker_task_conversation on public.worker_tasks;
create trigger worker_task_conversation after insert on public.worker_tasks
  for each row execute function public.tg_worker_task_conversation();

-- Vendor tasks: assigner (customer / venue owner / organization) <-> vendor.
create or replace function public.tg_vendor_task_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.get_or_create_conversation('vendor_task', new.id, new.task_name, new.assigned_by, 'assigner', new.vendor_user_id, 'vendor');
  return new;
end $$;
drop trigger if exists vendor_task_conversation on public.vendor_tasks;
create trigger vendor_task_conversation after insert on public.vendor_tasks
  for each row execute function public.tg_vendor_task_conversation();

-- Customer bookings: customer <-> whichever hall/vendor/worker owner they booked.
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

-- Realtime: let the client subscribe to new messages without polling.
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;
