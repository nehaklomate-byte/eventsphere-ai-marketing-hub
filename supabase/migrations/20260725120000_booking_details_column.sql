-- Common-section booking fields (event name, organizer type, event type,
-- contact person, timing, guest count, special instructions) don't have
-- dedicated columns on customer_bookings yet — guest_count wasn't even
-- being saved before. Rather than adding many narrow columns (and another
-- migration every time a field is added), this is one flexible bucket,
-- same pattern already used for additional_info on halls/vendors/etc.
alter table public.customer_bookings add column if not exists details jsonb not null default '{}'::jsonb;
