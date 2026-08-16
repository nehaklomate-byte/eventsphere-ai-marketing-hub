-- ============================================================
-- Booking & commission activity log.
--
-- profile_change_log (added earlier) only tracks edits to a role's
-- own profile fields (policy text, photos, etc). It says nothing
-- about what happens on an actual booking/task — how much a
-- customer paid, how much commission the platform cut, how much
-- was passed on to the venue/vendor/worker, or when a booking's
-- status/payment changed. That history was invisible to admin.
--
-- This adds a second, matching log — same shape, same generic
-- trigger pattern — but for the money-moving tables: customer
-- bookings (hall bookings), worker_tasks and vendor_tasks. Every
-- change to status, payment_status, amount or commission_amount
-- is recorded: old value, new value, who changed it, when.
-- ============================================================

create table if not exists public.booking_activity_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('customer_bookings','worker_tasks','vendor_tasks')),
  entity_id uuid not null,
  field_name text not null,
  old_value text,
  new_value text,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

alter table public.booking_activity_log enable row level security;

create index if not exists booking_activity_log_entity_idx on public.booking_activity_log (entity_type, entity_id, changed_at desc);
create index if not exists booking_activity_log_changed_at_idx on public.booking_activity_log (changed_at desc);

-- Ownership check, mirroring profile_change_log_is_owner — lets the
-- customer who made the booking, and the venue/vendor/worker on the
-- other side of it, see that booking's own history (not just admin).
create or replace function public.booking_activity_log_is_party(p_entity_type text, p_entity_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case p_entity_type
    when 'customer_bookings' then exists(
      select 1 from public.customer_bookings b
      where b.id = p_entity_id and (
        b.user_id = auth.uid()
        or (b.kind = 'hall' and exists(select 1 from public.halls h where h.id = b.target_id and h.owner_id = auth.uid()))
        or (b.kind = 'vendor' and exists(select 1 from public.vendors v where v.id = b.target_id and v.owner_id = auth.uid()))
        or (b.kind = 'worker' and exists(select 1 from public.workers w where w.id = b.target_id and w.owner_id = auth.uid()))
      )
    )
    when 'worker_tasks' then exists(
      select 1 from public.worker_tasks t
      where t.id = p_entity_id and (t.worker_user_id = auth.uid() or t.assigned_by = auth.uid())
    )
    when 'vendor_tasks' then exists(
      select 1 from public.vendor_tasks t
      where t.id = p_entity_id and (t.vendor_user_id = auth.uid() or t.assigned_by = auth.uid())
    )
    else false
  end;
$$;
revoke execute on function public.booking_activity_log_is_party(text, uuid) from public, anon;
grant execute on function public.booking_activity_log_is_party(text, uuid) to authenticated;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'booking_activity_log' and policyname = 'party or admin reads booking activity log') then
    create policy "party or admin reads booking activity log"
      on public.booking_activity_log for select to authenticated
      using (public.booking_activity_log_is_party(entity_type, entity_id) or public.has_role(auth.uid(), 'admin'));
  end if;
end $$;

-- inserts only ever happen via the trigger below (security definer) —
-- no client-facing insert/update/delete policy on purpose.

-- Generic trigger function — only watches the columns that actually
-- matter for a money/commission audit trail, not every column (a
-- task's venue_address changing isn't a financial event).
create or replace function public.tg_log_booking_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_old jsonb := to_jsonb(old);
  v_new jsonb := to_jsonb(new);
  v_key text;
  v_watch text[] := array['status','payment_status','amount','payment_amount','commission_amount','advance_amount','paid_at'];
begin
  foreach v_key in array v_watch loop
    if not (v_new ? v_key) then continue; end if;
    if v_old -> v_key is distinct from v_new -> v_key then
      insert into public.booking_activity_log (entity_type, entity_id, field_name, old_value, new_value, changed_by)
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

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'customer_bookings_log_activity') then
    create trigger customer_bookings_log_activity after update on public.customer_bookings
      for each row execute function public.tg_log_booking_activity();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'worker_tasks_log_activity') then
    create trigger worker_tasks_log_activity after update on public.worker_tasks
      for each row execute function public.tg_log_booking_activity();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'vendor_tasks_log_activity') then
    create trigger vendor_tasks_log_activity after update on public.vendor_tasks
      for each row execute function public.tg_log_booking_activity();
  end if;
end $$;
