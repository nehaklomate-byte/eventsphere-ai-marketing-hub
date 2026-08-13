-- ============================================================
-- Shareable Public Booking Profile — a paid, optional feature.
-- Registration, profile completion and marketplace listing stay
-- completely free for every role; this only gates a shareable public
-- URL (eventorbitnova.com/p/<slug>) that a provider can put on
-- WhatsApp/Instagram/visiting cards. Reuses the existing Razorpay
-- integration and the existing commission/booking architecture —
-- nothing here duplicates or replaces either.
-- ============================================================

-- 1) Slugs — halls already has one; vendors/workers didn't.
alter table public.vendors add column if not exists slug text unique;
alter table public.workers add column if not exists slug text unique;

-- 2) Activation flags — false/free by default. Never set true directly
--    by the client; only the verify-profile-payment Edge Function
--    (service role) is allowed to flip these, after a real payment.
alter table public.halls   add column if not exists public_profile_active boolean not null default false;
alter table public.halls   add column if not exists public_profile_activated_at timestamptz;
alter table public.vendors add column if not exists public_profile_active boolean not null default false;
alter table public.vendors add column if not exists public_profile_activated_at timestamptz;
alter table public.workers add column if not exists public_profile_active boolean not null default false;
alter table public.workers add column if not exists public_profile_activated_at timestamptz;

-- 3) Payment records for the public-profile activation fee. Kept
--    entirely separate from booking payments/commission — this is a
--    one-time platform fee, not a booking charge, and must never be
--    netted against a provider's booking settlement.
create table if not exists public.public_profile_payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('venue', 'vendor', 'worker')),
  entity_id uuid not null,
  entity_variant text check (entity_variant in ('individual', 'agency')),
  amount numeric(10,2) not null,
  razorpay_order_id text,
  razorpay_payment_id text,
  status text not null default 'created' check (status in ('created', 'paid', 'failed')),
  created_at timestamptz not null default now()
);

alter table public.public_profile_payments enable row level security;

create policy "owner reads own profile payments" on public.public_profile_payments
  for select to authenticated using (auth.uid() = owner_id);

create policy "owner creates own profile payment record" on public.public_profile_payments
  for insert to authenticated with check (auth.uid() = owner_id);

-- status only ever moves created -> paid/failed via the service-role
-- Edge Function after signature verification — no authenticated update policy.

create index if not exists public_profile_payments_owner_idx on public.public_profile_payments (owner_id);
create index if not exists public_profile_payments_entity_idx on public.public_profile_payments (role, entity_id);

-- 4) Booking source tracking — lets EventOrbit Nova see which bookings
--    came from the free marketplace vs a paid public-profile link vs a
--    direct platform booking, without touching commission logic at all.
alter table public.customer_bookings add column if not exists booking_source text not null default 'marketplace'
  check (booking_source in ('marketplace', 'public_profile_link', 'direct_platform_booking'));
alter table public.customer_bookings add column if not exists source_slug text;

alter table public.vendor_tasks add column if not exists booking_source text not null default 'marketplace'
  check (booking_source in ('marketplace', 'public_profile_link', 'direct_platform_booking'));
alter table public.vendor_tasks add column if not exists source_slug text;

alter table public.worker_tasks add column if not exists booking_source text not null default 'marketplace'
  check (booking_source in ('marketplace', 'public_profile_link', 'direct_platform_booking'));
alter table public.worker_tasks add column if not exists source_slug text;

alter table public.enquiries add column if not exists booking_source text not null default 'marketplace'
  check (booking_source in ('marketplace', 'public_profile_link', 'direct_platform_booking'));
alter table public.enquiries add column if not exists source_slug text;
