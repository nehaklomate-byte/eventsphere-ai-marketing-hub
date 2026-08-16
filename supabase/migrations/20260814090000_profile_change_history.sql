-- ============================================================
-- Profile update history — like a privacy-policy version log, but
-- for every role's own profile (venue/hall, vendor, worker, customer,
-- organization, and the shared account profile). Whenever any of
-- these rows is updated — no matter which page/flow did it — the
-- changed fields are recorded here: what changed, old value, new
-- value, who changed it, when.
--
-- Implemented as a single generic trigger reused across all six
-- tables, so it's enforced at the database level and can never be
-- bypassed by adding a new edit screen later.
-- ============================================================

-- 1) The log table itself.
create table if not exists public.profile_change_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('halls','vendors','workers','customers','profiles','organizations','org_members')),
  entity_id uuid not null,
  field_name text not null,
  old_value text,
  new_value text,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

alter table public.profile_change_log enable row level security;

create index if not exists profile_change_log_entity_idx on public.profile_change_log (entity_type, entity_id, changed_at desc);

-- 2) Ownership check used by the RLS policy below — maps an
--    entity_type/entity_id pair back to whoever owns that profile.
create or replace function public.profile_change_log_is_owner(p_entity_type text, p_entity_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case p_entity_type
    when 'halls' then exists(select 1 from public.halls where id = p_entity_id and owner_id = auth.uid())
    when 'vendors' then exists(select 1 from public.vendors where id = p_entity_id and owner_id = auth.uid())
    when 'workers' then exists(select 1 from public.workers where id = p_entity_id and owner_id = auth.uid())
    when 'customers' then exists(select 1 from public.customers where id = p_entity_id and user_id = auth.uid())
    when 'profiles' then p_entity_id = auth.uid()
    when 'organizations' then exists(select 1 from public.organizations where id = p_entity_id and owner_id = auth.uid())
    when 'org_members' then exists(
        select 1 from public.org_members m
        join public.organizations o on o.id = m.org_id
        where m.id = p_entity_id and (m.user_id = auth.uid() or o.owner_id = auth.uid())
      )
    else false
  end;
$$;
revoke execute on function public.profile_change_log_is_owner(text, uuid) from public, anon;
grant execute on function public.profile_change_log_is_owner(text, uuid) to authenticated;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profile_change_log' and policyname = 'owner or admin reads own profile change history') then
    create policy "owner or admin reads own profile change history"
      on public.profile_change_log for select to authenticated
      using (public.profile_change_log_is_owner(entity_type, entity_id) or public.has_role(auth.uid(), 'admin'));
  end if;
end $$;

-- inserts only ever happen via the trigger below (security definer) —
-- no client-facing insert/update/delete policy on purpose.

-- 3) The generic trigger function. Diffs OLD vs NEW for every column,
--    skips a short list of operational/system fields that aren't
--    meaningful "profile info" (timestamps, status/verification
--    flags, ratings, paid-feature flags), and logs the rest.
create or replace function public.tg_log_profile_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_old jsonb := to_jsonb(old);
  v_new jsonb := to_jsonb(new);
  v_key text;
  v_skip text[] := array[
    'id','created_at','updated_at','deleted_at',
    'status','verified','verification_status','rating','review_count',
    'public_profile_active','public_profile_activated_at',
    'trial_ends_at','subscription_active','subscription_expires_at',
    'blocked_dates','profile_completion','availability'
  ];
begin
  for v_key in select jsonb_object_keys(v_new) loop
    if v_key = any(v_skip) then continue; end if;
    if v_old -> v_key is distinct from v_new -> v_key then
      insert into public.profile_change_log (entity_type, entity_id, field_name, old_value, new_value, changed_by)
      values (
        tg_table_name,
        new.id,
        v_key,
        left(coalesce(v_old ->> v_key, ''), 500),
        left(coalesce(v_new ->> v_key, ''), 500),
        auth.uid()
      );
    end if;
  end loop;
  return new;
end $$;

-- 4) Attach it to every role-profile table. One trigger per table,
--    all sharing the same function.
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'halls_log_profile_change') then
    create trigger halls_log_profile_change after update on public.halls
      for each row execute function public.tg_log_profile_change();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'vendors_log_profile_change') then
    create trigger vendors_log_profile_change after update on public.vendors
      for each row execute function public.tg_log_profile_change();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'workers_log_profile_change') then
    create trigger workers_log_profile_change after update on public.workers
      for each row execute function public.tg_log_profile_change();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'customers_log_profile_change') then
    create trigger customers_log_profile_change after update on public.customers
      for each row execute function public.tg_log_profile_change();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'profiles_log_profile_change') then
    create trigger profiles_log_profile_change after update on public.profiles
      for each row execute function public.tg_log_profile_change();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'organizations_log_profile_change') then
    create trigger organizations_log_profile_change after update on public.organizations
      for each row execute function public.tg_log_profile_change();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'org_members_log_profile_change') then
    create trigger org_members_log_profile_change after update on public.org_members
      for each row execute function public.tg_log_profile_change();
  end if;
end $$;
