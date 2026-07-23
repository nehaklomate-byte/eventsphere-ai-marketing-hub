-- ============================================================
-- Venue Owner Dashboard — supporting schema
-- 1) Storage buckets that the app already expects (avatars, worker-media)
--    but that don't exist yet on a fresh Supabase project, PLUS a new
--    hall-media bucket for Venue Owner photos/videos/documents.
-- 2) RLS so a Hall/Vendor/Worker owner can see + update the bookings
--    customers made against their own listing (this was completely
--    missing before — only the customer who made the booking could
--    see it, so a venue owner had no way to confirm/reject anything).
-- ============================================================

-- 1. Storage buckets (public read — profile/gallery media is meant to be
--    publicly visible on the marketplace; writes are restricted below).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('worker-media', 'worker-media', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('hall-media', 'hall-media', true)
on conflict (id) do nothing;

-- Any authenticated user may upload/update/delete within these buckets
-- (the app already scopes the file path by user id / entity id client-side).
-- Public (anon) can only read, since the buckets are public.
do $$
declare
  b text;
begin
  foreach b in array array['avatars', 'worker-media', 'hall-media'] loop
    execute format('drop policy if exists "authenticated upload %s" on storage.objects', b);
    execute format(
      'create policy "authenticated upload %s" on storage.objects for insert to authenticated with check (bucket_id = %L)',
      b, b
    );
    execute format('drop policy if exists "authenticated update %s" on storage.objects', b);
    execute format(
      'create policy "authenticated update %s" on storage.objects for update to authenticated using (bucket_id = %L)',
      b, b
    );
    execute format('drop policy if exists "authenticated delete %s" on storage.objects', b);
    execute format(
      'create policy "authenticated delete %s" on storage.objects for delete to authenticated using (bucket_id = %L)',
      b, b
    );
    execute format('drop policy if exists "public read %s" on storage.objects', b);
    execute format(
      'create policy "public read %s" on storage.objects for select to anon, authenticated using (bucket_id = %L)',
      b, b
    );
  end loop;
end $$;

-- 2. customer_bookings: let the owner of the hall/vendor/worker being
--    booked see and update that booking (confirm / cancel / reschedule),
--    in addition to the customer who made it (existing policy untouched).
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
