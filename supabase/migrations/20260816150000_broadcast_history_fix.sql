-- ============================================================
-- Broadcast Center — "Previous messages" fix.
--
-- The original broadcast_messages migration guarded every policy
-- with "if not exists (select 1 from pg_policies where policyname =
-- ...)". That guard is safe the first time a migration runs, but if
-- this table/policy set had already been created once before (e.g.
-- by an earlier iteration of the same migration, which is exactly
-- what the "-FIXED" filename implies happened here), the guard
-- silently skips re-creating anything with a matching name — even
-- if that existing policy's definition was wrong or incomplete.
-- That's the most likely reason admin's "Previous messages" list
-- came back empty: the admin-can-read-everything policy may never
-- have actually landed with the right USING clause.
--
-- This migration is unconditional: it drops and recreates every
-- broadcast_messages / broadcast_message_reads policy by name, so
-- the final state is guaranteed correct regardless of what was
-- there before, on every environment.
-- ============================================================

drop policy if exists "users see broadcasts for their audience" on public.broadcast_messages;
create policy "users see broadcasts for their audience" on public.broadcast_messages
  for select to authenticated
  using (audience = 'all' or audience = (select primary_role::text from public.profiles where id = auth.uid()));

drop policy if exists "admin sees all broadcasts" on public.broadcast_messages;
create policy "admin sees all broadcasts" on public.broadcast_messages
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admin creates broadcasts" on public.broadcast_messages;
create policy "admin creates broadcasts" on public.broadcast_messages
  for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "user manages own reads" on public.broadcast_message_reads;
create policy "user manages own reads" on public.broadcast_message_reads
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "user marks own reads" on public.broadcast_message_reads;
create policy "user marks own reads" on public.broadcast_message_reads
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "admin sees all reads" on public.broadcast_message_reads;
create policy "admin sees all reads" on public.broadcast_message_reads
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Belt-and-braces: make sure RLS is actually turned on (a no-op if it
-- already was, but free insurance if this table was ever created
-- without it in an earlier partial run).
alter table public.broadcast_messages enable row level security;
alter table public.broadcast_message_reads enable row level security;
