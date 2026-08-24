-- ============================================================
-- profiles' RLS only lets a user read THEIR OWN row
-- (`auth.uid() = id`, from 20260705055546). That's correct for
-- protecting email/phone/address/payout details — but it also
-- silently blocked every "who is this?" name lookup the messaging
-- system needs: a customer opening a hall owner's chat, or a venue
-- owner opening a customer's chat, could never resolve the OTHER
-- person's name (the query just came back empty under RLS), which is
-- why every conversation and every message bubble showed "Someone" /
-- the wrong name instead of who it's actually with.
--
-- Fix: a narrow read-only view exposing only id + display name (full
-- name or business name) — nothing sensitive — visible to any
-- authenticated user. Views run with the privileges of their owner
-- by default (not the querying user's RLS) unless security_invoker
-- is set, so this intentionally bypasses profiles' own-row-only
-- policy for just these two columns.
-- ============================================================

create or replace view public.profile_directory as
select
  p.id,
  p.full_name,
  -- profiles itself has no business_name column (that lives on
  -- vendors, keyed by owner_id) — a vendor account's profiles.full_name
  -- is often blank since signup only asked for the business name, so
  -- pull it in here rather than showing "Someone" for every vendor.
  v.business_name
from public.profiles p
left join public.vendors v on v.owner_id = p.id;

grant select on public.profile_directory to authenticated;
