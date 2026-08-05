-- ============================================================
-- Admin payment visibility fix.
--
-- Bug: customer_bookings, worker_payouts, and vendor_payouts had no
-- RLS policy letting admin read them. Money was moving (Razorpay test
-- payments, worker/vendor payouts) and the customer/hall side
-- correctly showed "paid" / "completed", but admin had zero
-- visibility into any of it — Postgres RLS silently returned no rows
-- for the admin's queries, no matter what UI existed on top.
--
-- worker_tasks and vendor_tasks already had an admin read policy (see
-- 20260706070753 and 20260801100000/20260801124521). venue_payouts
-- already had one (20260802100000). This migration brings
-- customer_bookings, worker_payouts, and vendor_payouts in line, and
-- adds UPDATE policies so admin can mark a payout as paid.
-- ============================================================

drop policy if exists "admin reads all customer bookings" on public.customer_bookings;
create policy "admin reads all customer bookings" on public.customer_bookings
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admin reads all worker payouts" on public.worker_payouts;
create policy "admin reads all worker payouts" on public.worker_payouts
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admin updates worker payouts" on public.worker_payouts;
create policy "admin updates worker payouts" on public.worker_payouts
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admin reads all vendor payouts" on public.vendor_payouts;
create policy "admin reads all vendor payouts" on public.vendor_payouts
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admin updates vendor payouts" on public.vendor_payouts;
create policy "admin updates vendor payouts" on public.vendor_payouts
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admin updates venue payouts" on public.venue_payouts;
create policy "admin updates venue payouts" on public.venue_payouts
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));
