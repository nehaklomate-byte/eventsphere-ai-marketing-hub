-- ============================================================
-- Fix: admin Earnings page showing empty tabs.
--
-- Root cause #1: public_profile_payments had NO admin read policy at
-- all — only "owner reads own profile payments" existed, so admin's
-- queries silently returned zero rows no matter how much data was
-- actually there. This is why "Profile & Pro-plan" was empty.
--
-- Root cause #2 (insurance): the admin read policies for booking/task
-- payments (customer_bookings, worker_tasks, vendor_tasks,
-- worker_payouts, vendor_payouts, venue_payouts) already exist in
-- earlier migration files, but if those files were never actually run
-- against this database, the same "silently zero rows" problem would
-- explain "Booking payments" being empty too. Re-applying them here
-- (all idempotent — drop-if-exists then create) costs nothing if
-- they're already in place, and fixes it for certain if they weren't.
-- ============================================================

drop policy if exists "admin reads all profile payments" on public.public_profile_payments;
create policy "admin reads all profile payments" on public.public_profile_payments
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admin reads all customer bookings" on public.customer_bookings;
create policy "admin reads all customer bookings" on public.customer_bookings
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admin reads all tasks" on public.worker_tasks;
create policy "admin reads all tasks" on public.worker_tasks
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admin reads all vendor tasks" on public.vendor_tasks;
create policy "admin reads all vendor tasks" on public.vendor_tasks
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admin reads all worker payouts" on public.worker_payouts;
create policy "admin reads all worker payouts" on public.worker_payouts
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admin reads all vendor payouts" on public.vendor_payouts;
create policy "admin reads all vendor payouts" on public.vendor_payouts
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admin reads all venue payouts" on public.venue_payouts;
create policy "admin reads all venue payouts" on public.venue_payouts
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
