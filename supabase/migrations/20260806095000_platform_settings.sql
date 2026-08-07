-- ============================================================
-- platform_settings — this table was referenced by
-- 20260806100000_per_role_commission.sql (which does
-- `alter table platform_settings rename column commission_rate to
-- commission_rate_venue`) but was never actually created by any earlier
-- migration — that's the exact cause of the "relation
-- public.platform_settings does not exist" error. This file creates it
-- with the single `commission_rate` column the later migration expects
-- to rename, and seeds one settings row. Filename timestamp is chosen
-- to run BEFORE 20260806100000_per_role_commission.sql.
-- ============================================================

create table if not exists public.platform_settings (
  id uuid primary key default gen_random_uuid(),
  commission_rate numeric(5,2) not null default 10 check (commission_rate >= 0 and commission_rate <= 100),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

grant select on public.platform_settings to authenticated;
grant all on public.platform_settings to service_role;
alter table public.platform_settings enable row level security;

drop policy if exists "authenticated read platform settings" on public.platform_settings;
create policy "authenticated read platform settings" on public.platform_settings
  for select to authenticated using (true);

drop policy if exists "admin updates platform settings" on public.platform_settings;
create policy "admin updates platform settings" on public.platform_settings
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Exactly one settings row ever exists — every trigger in
-- per_role_commission.sql does `select ... from platform_settings limit 1`.
insert into public.platform_settings (commission_rate)
select 10 where not exists (select 1 from public.platform_settings);
