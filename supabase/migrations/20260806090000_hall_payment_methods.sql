-- Lets a venue owner tell customers, upfront, which payment methods
-- they accept (informational only — never confidential details like
-- account numbers). Shown on the public hall detail page.
alter table public.halls add column if not exists payment_methods text[] not null default '{}';
