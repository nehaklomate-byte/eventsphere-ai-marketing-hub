-- ============================================================
-- COMBINED — run this ONCE in Supabase → SQL Editor → New query → Run.
-- This is just the 4 pending migration files pasted one after another
-- (20260817090000, 20260817100000, 20260817110000, 20260817120000) —
-- nothing new, just bundled so you don't have to run them one at a
-- time. Safe to run even if some of them were already applied
-- (every line uses "if not exists", so it just skips what's already
-- there instead of erroring).
-- ============================================================

-- 1) Venue "in-house vs book separately" services + pricing options
alter table public.halls add column if not exists service_offerings jsonb not null default '{}'::jsonb;

-- 2) Venue GPS location, for "Near me" search
alter table public.halls add column if not exists latitude numeric;
alter table public.halls add column if not exists longitude numeric;

-- 3) Vendor/Worker pricing add-ons
alter table public.vendors add column if not exists pricing_options jsonb not null default '[]'::jsonb;
alter table public.workers add column if not exists pricing_options jsonb not null default '[]'::jsonb;

-- 4) Itemized receipts for vendor/worker bookings
alter table public.vendor_tasks add column if not exists selected_items jsonb not null default '[]'::jsonb;
alter table public.worker_tasks add column if not exists selected_items jsonb not null default '[]'::jsonb;

-- Quick self-check — run this separately afterwards if you want to
-- confirm all 7 columns now exist:
-- select table_name, column_name from information_schema.columns
-- where table_schema = 'public' and column_name in
--   ('service_offerings','latitude','longitude','pricing_options','selected_items')
-- order by table_name, column_name;
