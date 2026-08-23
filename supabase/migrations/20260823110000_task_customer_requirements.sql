-- ============================================================
-- Capture the customer's own words when hiring a vendor/worker.
--
-- Until now, `vendor_tasks.description` / `worker_tasks.description`
-- only ever held an auto-generated summary of the package and
-- add-ons picked ("Package: Premium Wedding Catering (₹45,000)\n
-- Drone: ₹5,000") — there was nowhere for the customer to actually
-- say what they need in their own words (e.g. "vegetarian only, no
-- onion/garlic, 3 starters and 2 desserts" or "candid + traditional,
-- need 1 videographer too"). That's a real gap: two customers could
-- pick the identical package and add-ons and need completely
-- different things from the vendor/worker on the day.
--
-- Fix: a separate `customer_requirements` column, kept distinct from
-- the selection summary so a vendor/worker (and later, admin/support)
-- can tell "what they picked" apart from "what they actually asked
-- for" at a glance, instead of it being buried inside one blob.
-- ============================================================

alter table public.vendor_tasks add column if not exists customer_requirements text;
alter table public.worker_tasks add column if not exists customer_requirements text;

comment on column public.vendor_tasks.customer_requirements is
  'Free text the customer typed when booking — their specific ask, in their own words. Distinct from `description`, which is an auto-generated summary of the package/add-ons picked.';
comment on column public.worker_tasks.customer_requirements is
  'Free text the customer typed when hiring — their specific ask, in their own words. Distinct from `description`, which is an auto-generated summary of the selections made.';
