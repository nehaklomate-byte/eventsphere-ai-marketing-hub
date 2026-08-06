-- ============================================================
-- Partner Terms acceptance tracking (lightweight interim solution ahead
-- of a full digitally-signed Partner Agreement — see EventOrbit_AI_Legal_Pack
-- Section 11). Records that a Vendor/Worker/Venue Owner explicitly
-- checked "I accept the Partner Terms" at the moment they submitted for
-- verification, with a timestamp as the acceptance record.
-- ============================================================

alter table public.vendors add column if not exists partner_terms_accepted_at timestamptz;
alter table public.workers add column if not exists partner_terms_accepted_at timestamptz;
alter table public.halls add column if not exists partner_terms_accepted_at timestamptz;
