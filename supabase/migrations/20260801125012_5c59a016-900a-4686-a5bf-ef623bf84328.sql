alter type public.verification_status add value if not exists 'suspended';
alter type public.verification_status add value if not exists 'blacklisted';
do $$
declare
  t text;
begin
  foreach t in array array['organizations', 'halls', 'vendors', 'workers'] loop
    execute format('alter table public.%I add column if not exists verification_status public.verification_status not null default ''pending''', t);
    execute format('alter table public.%I add column if not exists rejection_reason text', t);
    execute format('alter table public.%I add column if not exists verified_at timestamptz', t);
    execute format('alter table public.%I add column if not exists verified_by uuid references auth.users(id)', t);
    execute format('alter table public.%I add column if not exists documents jsonb not null default ''[]''::jsonb', t);
    execute format('alter table public.%I add column if not exists additional_info jsonb not null default ''{}''::jsonb', t);
  end loop;
end $$;
update public.organizations set verification_status = 'approved' where verified = true and verification_status = 'pending';
update public.halls         set verification_status = 'approved' where verified = true and verification_status = 'pending';
update public.vendors       set verification_status = 'approved' where verified = true and verification_status = 'pending';
update public.workers       set verification_status = 'approved' where verified = true and verification_status = 'pending';
create or replace function public.tg_sync_verified_boolean()
returns trigger language plpgsql set search_path = public as $$
begin
  new.verified := (new.verification_status = 'approved');
  if new.verification_status is distinct from old.verification_status
     and new.verification_status in ('approved','rejected','suspended','blacklisted') then
    new.verified_at := now();
  end if;
  return new;
end;
$$;
do $$
declare
  t text;
begin
  foreach t in array array['organizations', 'halls', 'vendors', 'workers'] loop
    execute format('drop trigger if exists sync_verified_boolean on public.%I', t);
    execute format('create trigger sync_verified_boolean before update on public.%I for each row execute function public.tg_sync_verified_boolean()', t);
  end loop;
end $$;
do $$
declare
  t text;
begin
  foreach t in array array['organizations', 'halls', 'vendors', 'workers'] loop
    execute format('drop policy if exists "Admin full read %s" on public.%I', t, t);
    execute format('create policy "Admin full read %s" on public.%I for select to authenticated using (public.has_role(auth.uid(), ''admin''))', t, t);
    execute format('drop policy if exists "Admin full update %s" on public.%I', t, t);
    execute format('create policy "Admin full update %s" on public.%I for update to authenticated using (public.has_role(auth.uid(), ''admin''))', t, t);
  end loop;
end $$;
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  actor_email text,
  action text not null,
  target_table text not null,
  target_id uuid not null,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);
grant select, insert on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
drop policy if exists "Admin read audit_logs" on public.audit_logs;
create policy "Admin read audit_logs" on public.audit_logs for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
drop policy if exists "Admin write audit_logs" on public.audit_logs;
create policy "Admin write audit_logs" on public.audit_logs for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
create table if not exists public.platform_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  type text not null default 'info',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, update, insert on public.platform_notifications to authenticated;
grant all on public.platform_notifications to service_role;
alter table public.platform_notifications enable row level security;
drop policy if exists "Own notifications read" on public.platform_notifications;
create policy "Own notifications read" on public.platform_notifications for select to authenticated
  using (user_id = auth.uid());
drop policy if exists "Own notifications update" on public.platform_notifications;
create policy "Own notifications update" on public.platform_notifications for update to authenticated
  using (user_id = auth.uid());
drop policy if exists "Admin can notify anyone" on public.platform_notifications;
create policy "Admin can notify anyone" on public.platform_notifications for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') or user_id = auth.uid());
create or replace view public.admin_verification_queue
with (security_invoker = true) as
  select 'organization'::text as role, id, name as title, city, state, email, phone,
         verification_status, rejection_reason, documents, created_at, owner_id as user_id
    from public.organizations
  union all
  select 'venue'::text, id, name, city, state, email, phone,
         verification_status, rejection_reason, documents, created_at, owner_id
    from public.halls
  union all
  select 'vendor'::text, id, business_name, city, state, email, phone,
         verification_status, rejection_reason, documents, created_at, owner_id
    from public.vendors
  union all
  select 'worker'::text, id, full_name, city, state, email, phone,
         verification_status, rejection_reason, documents, created_at, owner_id
    from public.workers;
grant select on public.admin_verification_queue to authenticated;
do $$
declare
  b text;
begin
  foreach b in array array['avatars', 'worker-media', 'hall-media'] loop
    execute format('drop policy if exists "authenticated upload %s" on storage.objects', b);
    execute format('create policy "authenticated upload %s" on storage.objects for insert to authenticated with check (bucket_id = %L)', b, b);
    execute format('drop policy if exists "authenticated update %s" on storage.objects', b);
    execute format('create policy "authenticated update %s" on storage.objects for update to authenticated using (bucket_id = %L)', b, b);
    execute format('drop policy if exists "authenticated delete %s" on storage.objects', b);
    execute format('create policy "authenticated delete %s" on storage.objects for delete to authenticated using (bucket_id = %L)', b, b);
    execute format('drop policy if exists "public read %s" on storage.objects', b);
    execute format('create policy "public read %s" on storage.objects for select to anon, authenticated using (bucket_id = %L)', b, b);
  end loop;
end $$;
drop policy if exists "Target owner reads bookings" on public.customer_bookings;
create policy "Target owner reads bookings" on public.customer_bookings for select to authenticated
  using (
    (kind = 'hall'   and exists (select 1 from public.halls   h where h.id = customer_bookings.target_id and h.owner_id = auth.uid()))
    or (kind = 'vendor' and exists (select 1 from public.vendors v where v.id = customer_bookings.target_id and v.owner_id = auth.uid()))
    or (kind = 'worker' and exists (select 1 from public.workers w where w.id = customer_bookings.target_id and w.owner_id = auth.uid()))
  );
drop policy if exists "Target owner updates bookings" on public.customer_bookings;
create policy "Target owner updates bookings" on public.customer_bookings for update to authenticated
  using (
    (kind = 'hall'   and exists (select 1 from public.halls   h where h.id = customer_bookings.target_id and h.owner_id = auth.uid()))
    or (kind = 'vendor' and exists (select 1 from public.vendors v where v.id = customer_bookings.target_id and v.owner_id = auth.uid()))
    or (kind = 'worker' and exists (select 1 from public.workers w where w.id = customer_bookings.target_id and w.owner_id = auth.uid()))
  );
drop policy if exists "Admin reads all profiles" on public.profiles;
create policy "Admin reads all profiles" on public.profiles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
drop policy if exists "Admin reads all user_roles" on public.user_roles;
create policy "Admin reads all user_roles" on public.user_roles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
do $$
begin
  if not exists (select 1 from pg_type where typname = 'account_status') then
    create type public.account_status as enum ('pending_approval', 'approved', 'rejected');
  end if;
end $$;
alter table public.profiles add column if not exists account_status public.account_status;
alter table public.profiles add column if not exists account_rejection_reason text;
update public.profiles set account_status = 'approved' where account_status is null;
create or replace function public.tg_set_account_status()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.primary_role is not null and new.account_status is null then
    new.account_status := case when new.primary_role in ('customer','admin') then 'approved' else 'pending_approval' end;
  end if;
  return new;
end;
$$;
drop trigger if exists set_account_status on public.profiles;
create trigger set_account_status before insert or update of primary_role on public.profiles
  for each row execute function public.tg_set_account_status();
drop policy if exists "Admin updates all profiles" on public.profiles;
create policy "Admin updates all profiles" on public.profiles for update to authenticated
  using (public.has_role(auth.uid(), 'admin'));
alter table public.customer_bookings add column if not exists details jsonb not null default '{}'::jsonb;