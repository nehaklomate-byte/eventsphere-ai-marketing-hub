-- ============================================================
-- Allow Customers to directly book Workers from the public marketplace.
--
-- The original "assigner creates tasks" policy only allowed
-- organization/hall_owner/vendor/admin to insert into worker_tasks.
-- Venue Owners hiring Workers (Phase 2) already worked under that policy.
-- Customers booking a Worker straight from /worker/$id did not — this
-- widens the same policy to include 'customer', using this codebase's
-- own drop-and-recreate convention. Nothing else about the policy changes.
-- ============================================================

drop policy if exists "assigner creates tasks" on public.worker_tasks;
create policy "assigner creates tasks" on public.worker_tasks
  for insert to authenticated with check (
    assigned_by = auth.uid()
    and (
      public.has_role(auth.uid(),'organization')
      or public.has_role(auth.uid(),'hall_owner')
      or public.has_role(auth.uid(),'vendor')
      or public.has_role(auth.uid(),'admin')
      or public.has_role(auth.uid(),'customer')
    )
  );
