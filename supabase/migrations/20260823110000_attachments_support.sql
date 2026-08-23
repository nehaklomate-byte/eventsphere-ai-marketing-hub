-- ============================================================
-- Photo/file attachment support for: chat messages, complaints,
-- customer reviews, and worker job postings.
--
-- One shared public bucket (`attachments`), folder-namespaced per
-- feature by the client (chat/<conversation_id>/..., complaints/<user_id>/...,
-- reviews/<user_id>/..., jobs/<vendor_or_org_or_hall_id>/...) — mirrors
-- the existing pattern already used for 'vendor-media'/'avatars'
-- (20260730090000_vendor_media_bucket.sql).
--
-- Each row's attachments are stored as jsonb: an array of
-- {url, name, type, size} objects — same shape everywhere, so the
-- AttachmentUpload/AttachmentGallery components work identically
-- across all four features.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

do $$
begin
  execute 'drop policy if exists "authenticated upload attachments" on storage.objects';
  execute 'create policy "authenticated upload attachments" on storage.objects for insert to authenticated with check (bucket_id = ''attachments'')';

  execute 'drop policy if exists "authenticated update attachments" on storage.objects';
  execute 'create policy "authenticated update attachments" on storage.objects for update to authenticated using (bucket_id = ''attachments'')';

  execute 'drop policy if exists "authenticated delete attachments" on storage.objects';
  execute 'create policy "authenticated delete attachments" on storage.objects for delete to authenticated using (bucket_id = ''attachments'')';
end $$;

alter table public.messages add column if not exists attachments jsonb not null default '[]'::jsonb;
alter table public.complaints add column if not exists attachments jsonb not null default '[]'::jsonb;
alter table public.customer_reviews add column if not exists photos jsonb not null default '[]'::jsonb;
alter table public.worker_job_postings add column if not exists attachments jsonb not null default '[]'::jsonb;
