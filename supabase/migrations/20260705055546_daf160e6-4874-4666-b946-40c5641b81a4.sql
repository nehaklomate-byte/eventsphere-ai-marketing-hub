
-- =============== ENUMS ===============
create type public.app_role as enum ('admin','organization','hall_owner','vendor','worker','customer');
create type public.hall_status as enum ('draft','published','archived');
create type public.enquiry_status as enum ('new','contacted','quoted','booked','declined','closed');
create type public.booking_status as enum ('pending','confirmed','cancelled','completed');

-- =============== UPDATED_AT helper ===============
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- =============== PROFILES ===============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  alt_phone text,
  avatar_url text,
  primary_role public.app_role,
  email_verified boolean not null default false,
  phone_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner"
  on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Profiles insert by owner"
  on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Profiles update by owner"
  on public.profiles for update to authenticated using (auth.uid() = id);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.tg_set_updated_at();

-- =============== USER ROLES ===============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create policy "Users can read their own roles"
  on public.user_roles for select to authenticated using (auth.uid() = user_id);
create policy "Admins manage roles"
  on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, phone, primary_role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email,
    new.raw_user_meta_data->>'phone',
    nullif(new.raw_user_meta_data->>'primary_role','')::public.app_role
  ) on conflict (id) do nothing;
  if (new.raw_user_meta_data->>'primary_role') is not null then
    insert into public.user_roles (user_id, role)
    values (new.id, (new.raw_user_meta_data->>'primary_role')::public.app_role)
    on conflict do nothing;
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============== ORGANIZATIONS ===============
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  org_type text,
  industry text,
  owner_full_name text,
  email text,
  phone text,
  alt_phone text,
  country text default 'India',
  state text,
  city text,
  address text,
  pincode text,
  website text,
  gst_number text,
  business_reg_number text,
  logo_url text,
  verified boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.organizations to authenticated;
grant all on public.organizations to service_role;
alter table public.organizations enable row level security;

create policy "Orgs owner read" on public.organizations for select to authenticated
  using (owner_id = auth.uid());
create policy "Orgs owner write" on public.organizations for insert to authenticated
  with check (owner_id = auth.uid());
create policy "Orgs owner update" on public.organizations for update to authenticated
  using (owner_id = auth.uid());
create policy "Orgs owner delete" on public.organizations for delete to authenticated
  using (owner_id = auth.uid());
create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.tg_set_updated_at();

-- =============== HALLS ===============
create table public.halls (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text unique,
  name text not null,
  owner_full_name text,
  email text,
  phone text,
  alt_phone text,
  category text,
  min_guests int,
  max_guests int,
  indoor_capacity int,
  outdoor_capacity int,
  dining_capacity int,
  parking_slots int,
  num_rooms int,
  changing_rooms int,
  facilities jsonb not null default '{}'::jsonb,
  address text,
  city text,
  state text,
  pincode text,
  country text default 'India',
  latitude numeric(9,6),
  longitude numeric(9,6),
  google_maps_url text,
  logo_url text,
  cover_url text,
  gallery jsonb not null default '[]'::jsonb,
  stage_photos jsonb not null default '[]'::jsonb,
  dining_photos jsonb not null default '[]'::jsonb,
  parking_photos jsonb not null default '[]'::jsonb,
  room_photos jsonb not null default '[]'::jsonb,
  washroom_photos jsonb not null default '[]'::jsonb,
  drone_photos jsonb not null default '[]'::jsonb,
  videos jsonb not null default '[]'::jsonb,
  price_per_day numeric(12,2),
  price_per_hour numeric(12,2),
  advance_amount numeric(12,2),
  cancellation_policy text,
  working_hours text,
  availability jsonb not null default '[]'::jsonb,
  social_links jsonb not null default '{}'::jsonb,
  website text,
  status public.hall_status not null default 'draft',
  verified boolean not null default false,
  rating numeric(3,2) not null default 0,
  review_count int not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.halls to authenticated;
grant select on public.halls to anon;
grant all on public.halls to service_role;
alter table public.halls enable row level security;

create policy "Published halls public read"
  on public.halls for select to anon, authenticated
  using (status = 'published' and deleted_at is null);
create policy "Owner reads own halls"
  on public.halls for select to authenticated using (owner_id = auth.uid());
create policy "Owner inserts halls"
  on public.halls for insert to authenticated with check (owner_id = auth.uid());
create policy "Owner updates halls"
  on public.halls for update to authenticated using (owner_id = auth.uid());
create policy "Owner deletes halls"
  on public.halls for delete to authenticated using (owner_id = auth.uid());

create trigger halls_updated_at before update on public.halls
  for each row execute function public.tg_set_updated_at();
create index halls_city_idx on public.halls(city);
create index halls_status_idx on public.halls(status);

-- =============== VENDORS ===============
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  owner_full_name text,
  category text,
  years_experience int,
  gst_number text,
  pan_number text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  pincode text,
  portfolio jsonb not null default '[]'::jsonb,
  price_catalogue_url text,
  logo_url text,
  instagram text,
  facebook text,
  website text,
  service_areas jsonb not null default '[]'::jsonb,
  available_days jsonb not null default '[]'::jsonb,
  status public.hall_status not null default 'draft',
  verified boolean not null default false,
  rating numeric(3,2) not null default 0,
  review_count int not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.vendors to authenticated;
grant select on public.vendors to anon;
grant all on public.vendors to service_role;
alter table public.vendors enable row level security;

create policy "Published vendors public read" on public.vendors for select to anon, authenticated
  using (status = 'published' and deleted_at is null);
create policy "Vendor owner read own" on public.vendors for select to authenticated
  using (owner_id = auth.uid());
create policy "Vendor owner insert" on public.vendors for insert to authenticated
  with check (owner_id = auth.uid());
create policy "Vendor owner update" on public.vendors for update to authenticated
  using (owner_id = auth.uid());
create policy "Vendor owner delete" on public.vendors for delete to authenticated
  using (owner_id = auth.uid());
create trigger vendors_updated_at before update on public.vendors
  for each row execute function public.tg_set_updated_at();

-- =============== WORKERS ===============
create table public.workers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  photo_url text,
  category text,
  skills jsonb not null default '[]'::jsonb,
  years_experience int,
  languages jsonb not null default '[]'::jsonb,
  phone text,
  email text,
  address text,
  city text,
  state text,
  pincode text,
  daily_charges numeric(10,2),
  hourly_charges numeric(10,2),
  available_days jsonb not null default '[]'::jsonb,
  emergency_contact text,
  status public.hall_status not null default 'draft',
  verified boolean not null default false,
  rating numeric(3,2) not null default 0,
  review_count int not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.workers to authenticated;
grant select on public.workers to anon;
grant all on public.workers to service_role;
alter table public.workers enable row level security;

create policy "Published workers public read" on public.workers for select to anon, authenticated
  using (status = 'published' and deleted_at is null);
create policy "Worker owner read own" on public.workers for select to authenticated
  using (owner_id = auth.uid());
create policy "Worker owner insert" on public.workers for insert to authenticated
  with check (owner_id = auth.uid());
create policy "Worker owner update" on public.workers for update to authenticated
  using (owner_id = auth.uid());
create policy "Worker owner delete" on public.workers for delete to authenticated
  using (owner_id = auth.uid());
create trigger workers_updated_at before update on public.workers
  for each row execute function public.tg_set_updated_at();

-- =============== ENQUIRIES ===============
create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references auth.users(id) on delete set null,
  hall_id uuid references public.halls(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete cascade,
  worker_id uuid references public.workers(id) on delete cascade,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  event_date date,
  guest_count int,
  message text,
  status public.enquiry_status not null default 'new',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.enquiries to authenticated;
grant insert on public.enquiries to anon;
grant all on public.enquiries to service_role;
alter table public.enquiries enable row level security;

create policy "Anyone can create enquiry"
  on public.enquiries for insert to anon, authenticated with check (true);
create policy "Requester reads own enquiries"
  on public.enquiries for select to authenticated using (requester_id = auth.uid());
create policy "Target owner reads their enquiries"
  on public.enquiries for select to authenticated using (
    (hall_id is not null and exists (select 1 from public.halls h where h.id = enquiries.hall_id and h.owner_id = auth.uid()))
    or (vendor_id is not null and exists (select 1 from public.vendors v where v.id = enquiries.vendor_id and v.owner_id = auth.uid()))
    or (worker_id is not null and exists (select 1 from public.workers w where w.id = enquiries.worker_id and w.owner_id = auth.uid()))
  );
create policy "Target owner updates their enquiries"
  on public.enquiries for update to authenticated using (
    (hall_id is not null and exists (select 1 from public.halls h where h.id = enquiries.hall_id and h.owner_id = auth.uid()))
    or (vendor_id is not null and exists (select 1 from public.vendors v where v.id = enquiries.vendor_id and v.owner_id = auth.uid()))
    or (worker_id is not null and exists (select 1 from public.workers w where w.id = enquiries.worker_id and w.owner_id = auth.uid()))
  );

-- =============== REVIEWS ===============
create table public.hall_reviews (
  id uuid primary key default gen_random_uuid(),
  hall_id uuid not null references public.halls(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (hall_id, author_id)
);
grant select on public.hall_reviews to anon, authenticated;
grant insert, update, delete on public.hall_reviews to authenticated;
grant all on public.hall_reviews to service_role;
alter table public.hall_reviews enable row level security;

create policy "Reviews public read" on public.hall_reviews for select to anon, authenticated using (true);
create policy "Reviews author insert" on public.hall_reviews for insert to authenticated with check (author_id = auth.uid());
create policy "Reviews author update" on public.hall_reviews for update to authenticated using (author_id = auth.uid());
create policy "Reviews author delete" on public.hall_reviews for delete to authenticated using (author_id = auth.uid());
