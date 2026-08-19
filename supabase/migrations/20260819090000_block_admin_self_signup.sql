-- ============================================================
-- CRITICAL SECURITY FIX — anyone could make themselves admin.
--
-- Root cause: public.handle_new_user() (trigger on auth.users, runs
-- as SECURITY DEFINER so it bypasses RLS) blindly took whatever role
-- name was sent in the signup call's metadata:
--
--   supabase.auth.signUp({ email, password,
--     options: { data: { primary_role: 'admin' } } })
--
-- ...and inserted it straight into user_roles. The register.tsx form
-- never *offers* "admin" as a choice, but that's a frontend-only
-- restriction — anyone with the public anon key (which is meant to
-- be public, it's in every browser tab) could call supabase-js
-- directly from devtools/curl with primary_role: 'admin' and the
-- trigger would grant them full admin access immediately, with no
-- approval step. The "Admins manage roles" RLS policy on user_roles
-- never even ran, because this trigger runs with elevated privilege
-- and inserts directly.
--
-- Fix: the trigger now hard-refuses 'admin' as a self-service role,
-- no matter what the client sends. Admin can ONLY be granted by an
-- existing admin, manually, afterwards (via SQL or an admin UI you
-- build later) — never through public registration.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role public.app_role;
begin
  v_role := nullif(new.raw_user_meta_data->>'primary_role','')::public.app_role;

  -- Hard block: 'admin' can never be self-assigned at signup, period.
  if v_role = 'admin' then
    v_role := null;
  end if;

  insert into public.profiles (id, full_name, email, phone, primary_role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email,
    new.raw_user_meta_data->>'phone',
    v_role
  ) on conflict (id) do nothing;

  if v_role is not null then
    insert into public.user_roles (user_id, role)
    values (new.id, v_role)
    on conflict do nothing;
  end if;

  return new;
end $$;

-- ------------------------------------------------------------
-- AUDIT — run this block yourself right after applying this file.
-- It lists every account that currently holds the admin role, so
-- you can confirm it really is only the one admin you expect. If
-- anything unexpected shows up here, remove it immediately with:
--   delete from public.user_roles where user_id = '<bad-user-id>' and role = 'admin';
-- ------------------------------------------------------------
-- select ur.user_id, p.email, p.full_name, ur.created_at
-- from public.user_roles ur
-- join public.profiles p on p.id = ur.user_id
-- where ur.role = 'admin'
-- order by ur.created_at asc;
