-- ============================================================
-- Vendor/Worker "pricing add-ons" — combinable a-la-carte extras
-- (name + price, optionally per-guest) a customer ticks on the
-- public profile so their final price is calculated from what they
-- actually need, instead of typing a guessed "offer amount" into a
-- blank field. See src/components/PricingOptionsEditor.tsx (owner
-- side) and vendor.$id.tsx / worker.$id.tsx (customer side).
--
-- Shape: [{ "id": "...", "name": "Extra hour", "price": 2000,
--            "per_guest": false }, ...]
--
-- Distinct from vendors' existing `vendor_packages` table (exclusive
-- tiers — Basic/Premium/Luxury, pick ONE) — these are combinable
-- extras stacked on top of a package or the base price, so a
-- separate jsonb column is simpler than another join table.
-- ============================================================

alter table public.vendors add column if not exists pricing_options jsonb not null default '[]'::jsonb;
alter table public.workers add column if not exists pricing_options jsonb not null default '[]'::jsonb;
