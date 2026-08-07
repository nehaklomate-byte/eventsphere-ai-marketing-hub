-- ============================================================
-- Admin dashboard analytics needs a platform-wide count of customer
-- events, but customer_events only had an owner-only RLS policy
-- ("cevents_owner_all") — admin queries silently returned 0 rows.
-- This adds the same admin-read pattern already used on
-- organizations/halls/vendors/workers/customer_bookings/worker_tasks/
-- vendor_tasks (see 20260722120000_admin_verification_center.sql and
-- 20260805110000_admin_payment_visibility.sql).
-- ============================================================

drop policy if exists "admin reads all customer events" on public.customer_events;
create policy "admin reads all customer events" on public.customer_events
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
