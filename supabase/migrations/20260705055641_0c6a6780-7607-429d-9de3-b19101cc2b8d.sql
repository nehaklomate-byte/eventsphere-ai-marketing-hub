
-- Tighten enquiry insert policy
drop policy if exists "Anyone can create enquiry" on public.enquiries;
create policy "Auth user creates own enquiry" on public.enquiries
  for insert to authenticated with check (requester_id = auth.uid());
create policy "Anon creates enquiry as guest" on public.enquiries
  for insert to anon with check (requester_id is null);

-- Lock down security definer function execute
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.tg_set_updated_at() from public, anon, authenticated;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

-- Storage policies: owners manage their own files inside these buckets
create policy "Auth users read own bucket files"
  on storage.objects for select to authenticated
  using (bucket_id in ('avatars','hall-media','vendor-media','worker-media','org-logos')
         and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Auth users insert own bucket files"
  on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars','hall-media','vendor-media','worker-media','org-logos')
              and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Auth users update own bucket files"
  on storage.objects for update to authenticated
  using (bucket_id in ('avatars','hall-media','vendor-media','worker-media','org-logos')
         and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Auth users delete own bucket files"
  on storage.objects for delete to authenticated
  using (bucket_id in ('avatars','hall-media','vendor-media','worker-media','org-logos')
         and auth.uid()::text = (storage.foldername(name))[1]);
