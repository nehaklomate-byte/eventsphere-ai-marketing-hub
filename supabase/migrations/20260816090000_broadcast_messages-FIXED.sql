-- ============================================================
-- Broadcast messages — admin announcements with a real deadline and
-- per-user "seen it" tracking, shown once per user (server-side, so
-- it survives across devices/browsers, unlike the old localStorage
-- dismiss). Replaces the old approach of faking a broadcast history
-- by grouping individual platform_notifications rows.
-- ============================================================

create table if not exists public.broadcast_messages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  type text not null default 'info' check (type in ('info','success','warning','error')),
  audience text not null default 'all' check (audience in ('all','customer','hall_owner','vendor','worker','organization')),
  deadline timestamptz, -- null = never expires
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.broadcast_messages enable row level security;
create index if not exists broadcast_messages_created_at_idx on public.broadcast_messages (created_at desc);

-- One row per user per message they've seen/dismissed — this is what
-- makes a message show exactly once, forever, per user.
create table if not exists public.broadcast_message_reads (
  message_id uuid not null references public.broadcast_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table public.broadcast_message_reads enable row level security;
create index if not exists broadcast_message_reads_user_idx on public.broadcast_message_reads (user_id);

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'broadcast_messages' and policyname = 'users see broadcasts for their audience') then
    create policy "users see broadcasts for their audience" on public.broadcast_messages
      for select to authenticated
      using (audience = 'all' or audience = (select primary_role::text from public.profiles where id = auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'broadcast_messages' and policyname = 'admin sees all broadcasts') then
    create policy "admin sees all broadcasts" on public.broadcast_messages
      for select to authenticated using (public.has_role(auth.uid(), 'admin'));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'broadcast_messages' and policyname = 'admin creates broadcasts') then
    create policy "admin creates broadcasts" on public.broadcast_messages
      for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'broadcast_message_reads' and policyname = 'user manages own reads') then
    create policy "user manages own reads" on public.broadcast_message_reads
      for select to authenticated using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'broadcast_message_reads' and policyname = 'user marks own reads') then
    create policy "user marks own reads" on public.broadcast_message_reads
      for insert to authenticated with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'broadcast_message_reads' and policyname = 'admin sees all reads') then
    create policy "admin sees all reads" on public.broadcast_message_reads
      for select to authenticated using (public.has_role(auth.uid(), 'admin'));
  end if;
end $$;
