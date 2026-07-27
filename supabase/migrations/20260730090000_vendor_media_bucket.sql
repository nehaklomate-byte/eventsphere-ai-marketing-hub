-- ============================================================
-- Vendor Module — Phase A: storage bucket for portfolio/logo/documents.
-- Mirrors the exact pattern already used for 'worker-media'/'hall-media'
-- in 20260723090000_venue_owner_support.sql.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('vendor-media', 'vendor-media', true)
on conflict (id) do nothing;

do $$
begin
  execute 'drop policy if exists "authenticated upload vendor-media" on storage.objects';
  execute 'create policy "authenticated upload vendor-media" on storage.objects for insert to authenticated with check (bucket_id = ''vendor-media'')';

  execute 'drop policy if exists "authenticated update vendor-media" on storage.objects';
  execute 'create policy "authenticated update vendor-media" on storage.objects for update to authenticated using (bucket_id = ''vendor-media'')';

  execute 'drop policy if exists "authenticated delete vendor-media" on storage.objects';
  execute 'create policy "authenticated delete vendor-media" on storage.objects for delete to authenticated using (bucket_id = ''vendor-media'')';
end $$;
