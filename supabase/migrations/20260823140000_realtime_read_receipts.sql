-- ============================================================
-- WhatsApp-style "Seen" ticks need conversation_participants updates
-- (last_read_at) to arrive over realtime, same as messages already do.
-- Without this, the ChatPanel subscription for read-receipts silently
-- never fires and the tick only updates on next page load/reopen.
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversation_participants'
  ) then
    alter publication supabase_realtime add table public.conversation_participants;
  end if;
end $$;
