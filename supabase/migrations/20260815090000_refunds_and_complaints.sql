-- ============================================================
-- Refunds + Complaints — gives admin one place to see money that
-- went OUT (not just in), and issues customers/vendors/workers/venues
-- raise. Neither existed before: 'refunded' was only a payment_status
-- value with no record of who asked, how much, why, or who actioned it.
-- ============================================================

-- 1) Refunds — one row per refund, whatever it's against (a hall
--    booking, a worker/vendor task, or a profile-activation/
--    subscription payment). entity_name is a denormalized snapshot
--    (booking/task/profile name at the time of the request) purely so
--    admin doesn't need N joins to show a readable list — it is NOT
--    kept in sync with later renames, by design (a refund record
--    should read the way it did when it was requested).
create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('booking','worker_task','vendor_task','profile_payment')),
  source_id uuid not null,
  entity_name text,
  amount numeric(12,2) not null check (amount >= 0),
  reason text,
  requested_by uuid references auth.users(id) on delete set null,
  status text not null default 'requested' check (status in ('requested','approved','rejected','processed')),
  admin_notes text,
  razorpay_refund_id text,
  processed_by uuid references auth.users(id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.refunds enable row level security;
create index if not exists refunds_requested_by_idx on public.refunds (requested_by);
create index if not exists refunds_source_idx on public.refunds (source_type, source_id);

create policy "requester reads own refund requests" on public.refunds
  for select to authenticated using (auth.uid() = requested_by);
create policy "requester creates own refund request" on public.refunds
  for insert to authenticated with check (auth.uid() = requested_by);
create policy "admin reads all refunds" on public.refunds
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admin updates all refunds" on public.refunds
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admin creates any refund" on public.refunds
  for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));

-- 2) Complaints — a simple support-ticket table any role can raise
--    against the platform, a booking, or another party.
create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  raised_by uuid not null references auth.users(id) on delete cascade,
  raised_by_role text,
  subject text not null,
  description text not null,
  related_source_type text check (related_source_type in ('booking','worker_task','vendor_task','profile_payment')),
  related_source_id uuid,
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  admin_notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.complaints enable row level security;
create index if not exists complaints_raised_by_idx on public.complaints (raised_by);

create policy "raiser reads own complaints" on public.complaints
  for select to authenticated using (auth.uid() = raised_by);
create policy "raiser creates own complaint" on public.complaints
  for insert to authenticated with check (auth.uid() = raised_by);
create policy "admin reads all complaints" on public.complaints
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admin updates all complaints" on public.complaints
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));
