
-- =========================================================
-- Customer module schema (idempotent, additive only)
-- =========================================================

-- ENUMS
do $$ begin
  create type public.customer_status as enum ('active','inactive','suspended','deleted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.customer_event_status as enum ('planning','upcoming','completed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.customer_booking_kind as enum ('hall','vendor','worker');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.customer_booking_status as enum ('pending','confirmed','in_progress','completed','cancelled','reschedule_requested');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.customer_payment_status as enum ('pending','paid','failed','refunded','partial');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.customer_wishlist_kind as enum ('hall','vendor','worker');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.customer_notification_kind as enum ('booking','payment','offer','system','review');
exception when duplicate_object then null; end $$;

-- =========================================================
-- customers
-- =========================================================
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  gender text,
  date_of_birth date,
  avatar_url text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  pincode text,
  status public.customer_status not null default 'active',
  profile_completion int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.customers to authenticated;
grant all on public.customers to service_role;
alter table public.customers enable row level security;

do $$ begin
  create policy "customers_owner_all" on public.customers
    for all to authenticated
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "customers_admin_read" on public.customers
    for select to authenticated
    using (public.has_role(auth.uid(), 'admin'));
exception when duplicate_object then null; end $$;

-- =========================================================
-- customer_preferences
-- =========================================================
create table if not exists public.customer_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  theme text not null default 'system',            -- 'light' | 'dark' | 'system'
  language text not null default 'en',
  email_notifications boolean not null default true,
  sms_notifications boolean not null default false,
  push_notifications boolean not null default true,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.customer_preferences to authenticated;
grant all on public.customer_preferences to service_role;
alter table public.customer_preferences enable row level security;
do $$ begin
  create policy "cprefs_owner_all" on public.customer_preferences
    for all to authenticated
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- =========================================================
-- customer_events
-- =========================================================
create table if not exists public.customer_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  event_type text,
  event_date date,
  venue text,
  guests int,
  budget numeric(12,2),
  status public.customer_event_status not null default 'planning',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.customer_events to authenticated;
grant all on public.customer_events to service_role;
alter table public.customer_events enable row level security;
do $$ begin
  create policy "cevents_owner_all" on public.customer_events
    for all to authenticated
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
create index if not exists cevents_user_idx on public.customer_events(user_id, event_date desc);

-- =========================================================
-- customer_bookings
-- =========================================================
create table if not exists public.customer_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.customer_booking_kind not null,
  target_id uuid,                       -- hall / vendor / worker id
  target_name text not null,
  event_id uuid references public.customer_events(id) on delete set null,
  event_date date,
  amount numeric(12,2) not null default 0,
  status public.customer_booking_status not null default 'pending',
  payment_status public.customer_payment_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.customer_bookings to authenticated;
grant all on public.customer_bookings to service_role;
alter table public.customer_bookings enable row level security;
do $$ begin
  create policy "cbookings_owner_all" on public.customer_bookings
    for all to authenticated
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
create index if not exists cbookings_user_idx on public.customer_bookings(user_id, created_at desc);

-- =========================================================
-- customer_wishlist
-- =========================================================
create table if not exists public.customer_wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.customer_wishlist_kind not null,
  target_id uuid not null,
  target_name text not null,
  target_image_url text,
  target_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, kind, target_id)
);
grant select, insert, update, delete on public.customer_wishlist to authenticated;
grant all on public.customer_wishlist to service_role;
alter table public.customer_wishlist enable row level security;
do $$ begin
  create policy "cwish_owner_all" on public.customer_wishlist
    for all to authenticated
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- =========================================================
-- customer_notifications
-- =========================================================
create table if not exists public.customer_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.customer_notification_kind not null default 'system',
  title text not null,
  body text,
  action_url text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.customer_notifications to authenticated;
grant all on public.customer_notifications to service_role;
alter table public.customer_notifications enable row level security;
do $$ begin
  create policy "cnotif_owner_read" on public.customer_notifications
    for select to authenticated using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "cnotif_owner_update" on public.customer_notifications
    for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "cnotif_owner_delete" on public.customer_notifications
    for delete to authenticated using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
-- Inserts happen via service_role/triggers; no INSERT policy for authenticated
create index if not exists cnotif_user_idx on public.customer_notifications(user_id, created_at desc);

-- Enable realtime
do $$ begin
  alter publication supabase_realtime add table public.customer_notifications;
exception when duplicate_object then null; when others then null; end $$;

-- =========================================================
-- customer_payments
-- =========================================================
create table if not exists public.customer_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid references public.customer_bookings(id) on delete set null,
  invoice_number text,
  description text not null,
  amount numeric(12,2) not null,
  currency text not null default 'INR',
  status public.customer_payment_status not null default 'pending',
  method text,
  receipt_url text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.customer_payments to authenticated;
grant all on public.customer_payments to service_role;
alter table public.customer_payments enable row level security;
do $$ begin
  create policy "cpay_owner_all" on public.customer_payments
    for all to authenticated
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
create index if not exists cpay_user_idx on public.customer_payments(user_id, created_at desc);

-- =========================================================
-- customer_reviews
-- =========================================================
create table if not exists public.customer_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.customer_wishlist_kind not null,       -- reuse hall/vendor/worker
  target_id uuid not null,
  target_name text not null,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, kind, target_id)
);
grant select, insert, update, delete on public.customer_reviews to authenticated;
grant all on public.customer_reviews to service_role;
alter table public.customer_reviews enable row level security;
do $$ begin
  create policy "creview_owner_all" on public.customer_reviews
    for all to authenticated
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
-- Public read of reviews (aggregate/display)
do $$ begin
  create policy "creview_public_read" on public.customer_reviews
    for select to anon using (true);
exception when duplicate_object then null; end $$;
grant select on public.customer_reviews to anon;

-- =========================================================
-- Updated-at triggers (reuse existing tg_set_updated_at)
-- =========================================================
do $$
declare t text;
begin
  foreach t in array array[
    'customers','customer_preferences','customer_events',
    'customer_bookings','customer_payments','customer_reviews'
  ]
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I; '
      'create trigger set_updated_at before update on public.%I '
      'for each row execute function public.tg_set_updated_at();', t, t);
  end loop;
end $$;
