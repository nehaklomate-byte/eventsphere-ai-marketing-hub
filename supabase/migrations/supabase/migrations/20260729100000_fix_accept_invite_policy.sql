-- ============================================================
-- Fix: the "claim own membership" policy still required the row to end
-- up as 'active', but acceptInvite() now correctly sets it to
-- 'pending_confirmation' first. Update the WITH CHECK to match.
-- ============================================================

drop policy if exists "Invited user claims own membership" on public.org_members;
create policy "Invited user claims own membership" on public.org_members for update to authenticated
  using (invite_token is not null and status = 'invited')
  with check (user_id = auth.uid() and status = 'pending_confirmation');

NOTIFY pgrst, 'reload schema';
