-- ============================================================
-- "Near me" search — halls record their GPS coordinates (captured
-- from the venue owner's device on their profile page, see the new
-- "Use my current location" button in Location section) so the
-- marketplace can sort/filter venues by actual distance instead of
-- just a city-name text match. Nullable — a hall with no coordinates
-- set yet simply doesn't show up when a customer searches "Near me",
-- it still shows normally in the regular list.
-- ============================================================

alter table public.halls add column if not exists latitude numeric;
alter table public.halls add column if not exists longitude numeric;
