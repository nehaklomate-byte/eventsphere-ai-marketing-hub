-- ============================================================
-- Contact form backend. The public /contact page previously had
-- onSubmit={(e) => e.preventDefault()} — it rendered a full form
-- but never sent the message anywhere. This gives it somewhere
-- real to go: a table anyone (including anonymous visitors) can
-- insert into, that only admins can read.
-- ============================================================

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  organisation text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'read', 'archived')),
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

-- Anyone (logged in or not) can submit the contact form.
create policy "Anyone can send a contact message" on public.contact_messages
  for insert to anon, authenticated with check (true);

-- Only admins can read or triage submissions.
create policy "Admin reads contact messages" on public.contact_messages
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create policy "Admin updates contact messages" on public.contact_messages
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));

create index if not exists contact_messages_created_at_idx on public.contact_messages (created_at desc);
