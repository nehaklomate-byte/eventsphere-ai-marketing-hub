insert into storage.buckets (id, name, public)
values ('vendor-media', 'vendor-media', true)
on conflict (id) do nothing;

drop policy if exists "authenticated upload vendor-media" on storage.objects;
create policy "authenticated upload vendor-media" on storage.objects for insert to authenticated with check (bucket_id = 'vendor-media');
drop policy if exists "authenticated update vendor-media" on storage.objects;
create policy "authenticated update vendor-media" on storage.objects for update to authenticated using (bucket_id = 'vendor-media');
drop policy if exists "authenticated delete vendor-media" on storage.objects;
create policy "authenticated delete vendor-media" on storage.objects for delete to authenticated using (bucket_id = 'vendor-media');
drop policy if exists "public read vendor-media" on storage.objects;
create policy "public read vendor-media" on storage.objects for select to anon, authenticated using (bucket_id = 'vendor-media');
