-- ============================================================
-- Package pricing (vendor) + quantity selection (worker/vendor booking)
-- — per Neha's product notes: vendors need tiered packages
-- (Basic/Premium/Luxury) instead of one flat price, and agency workers
-- need a "how many workers?" quantity on the booking form instead of
-- implicitly booking just one person.
-- ============================================================

-- ---------- vendor packages ----------
create table if not exists public.vendor_packages (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  name text not null,                 -- "Basic" / "Premium" / "Luxury" / anything custom
  price numeric(10,2) not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.vendor_packages to authenticated;
grant select on public.vendor_packages to anon;
grant all on public.vendor_packages to service_role;
alter table public.vendor_packages enable row level security;

drop policy if exists "public reads packages of published vendors" on public.vendor_packages;
create policy "public reads packages of published vendors" on public.vendor_packages
  for select to anon, authenticated
  using (exists (select 1 from public.vendors v where v.id = vendor_packages.vendor_id and v.status = 'published' and v.deleted_at is null));

drop policy if exists "vendor owner manages own packages" on public.vendor_packages;
create policy "vendor owner manages own packages" on public.vendor_packages
  for all to authenticated
  using (exists (select 1 from public.vendors v where v.id = vendor_packages.vendor_id and v.owner_id = auth.uid()))
  with check (exists (select 1 from public.vendors v where v.id = vendor_packages.vendor_id and v.owner_id = auth.uid()));

drop trigger if exists vendor_packages_updated_at on public.vendor_packages;
create trigger vendor_packages_updated_at before update on public.vendor_packages
  for each row execute function public.tg_set_updated_at();

create index if not exists vendor_packages_vendor_idx on public.vendor_packages(vendor_id, sort_order);

-- ---------- agency booking limits (worker side) ----------
-- "Minimum Booking: 5 Workers / Maximum: 50 Workers" from an agency
-- profile — only meaningful when worker_type = 'agency'.
alter table public.workers add column if not exists min_booking_qty integer;
alter table public.workers add column if not exists max_booking_qty integer;

-- ---------- quantity on the booking itself ----------
-- How many workers/team-members this specific booking is for. Defaults
-- to 1 so every existing row (and every individual booking) is
-- unaffected; only agency bookings will set this above 1.
alter table public.worker_tasks add column if not exists quantity integer not null default 1;
alter table public.vendor_tasks add column if not exists quantity integer not null default 1;
alter table public.customer_bookings add column if not exists quantity integer not null default 1;
