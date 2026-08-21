-- ============================================================
-- Booking snapshot for HALL bookings (spec: "confirmed booking
-- must never change retroactively").
--
-- Money itself was already safe before this migration:
--   - customer_bookings.amount is typed manually by the venue owner
--     (never derived from a live formula), so it never silently
--     changes.
--   - commission_amount (20260806100000_per_role_commission.sql)
--     is computed exactly once, the instant payment_status first
--     becomes 'paid', and is never recomputed after.
--
-- What was still missing: the SUPPORTING CONTEXT behind that amount
-- — which guest tier applied, what amenities the venue had at the
-- time, and what price the requested in-house service options
-- actually carried — was never captured. All of that lived only in
-- the halls table, which the owner can keep editing. An admin
-- investigating an old booking, or a customer disputing a receipt,
-- had no way to see what the numbers were actually based on when the
-- booking was made — exactly the "admin must never need to
-- reconstruct an old booking from current profile data" problem.
--
-- Fix: the moment the owner sets the final price (final_price_set_at
-- going from null to not-null — the real "commercially confirmed"
-- point in this flow), copy a frozen snapshot of the relevant hall
-- data into a new customer_bookings.snapshot column. Never
-- overwritten after that, even if the owner edits the price again
-- later or the hall profile changes.
-- ============================================================

alter table public.customer_bookings add column if not exists snapshot jsonb;

create or replace function public.tg_snapshot_hall_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  h record;
  gcount integer;
  applicable_tier jsonb;
  requested jsonb;
  frozen_services jsonb := '[]'::jsonb;
  item jsonb;
  cat text;
  opt jsonb;
begin
  if new.kind <> 'hall' then
    return new;
  end if;

  -- Only fire at the exact moment the price is first set. Never
  -- re-snapshot after that, even if amount/final_price_set_at are
  -- edited again later — the first commercial commitment is what
  -- must stay frozen.
  if not (old.final_price_set_at is null and new.final_price_set_at is not null) then
    return new;
  end if;

  select * into h from public.halls where id = new.target_id;
  if not found then
    return new;
  end if;

  gcount := nullif(new.details->>'guest_count', '')::integer;

  -- Which guest-count tier (if any) applied at this moment.
  select to_jsonb(t) into applicable_tier
  from jsonb_to_recordset(coalesce(h.guest_pricing_tiers, '[]'::jsonb)) as t(max_guests integer, price numeric)
  where gcount is not null and t.max_guests >= gcount
  order by t.max_guests asc
  limit 1;

  -- Freeze the current price of each service the customer asked
  -- about (requested_services was recorded, name-only, at request
  -- time — this is where it finally gets a price attached, frozen
  -- for good).
  requested := coalesce(new.details->'requested_services', '[]'::jsonb);
  for item in select * from jsonb_array_elements(requested)
  loop
    cat := item->>'category';
    select o into opt
    from jsonb_array_elements(coalesce(h.service_offerings->cat->'options', '[]'::jsonb)) o
    where (o->>'name') = (item->>'name')
    limit 1;
    frozen_services := frozen_services || jsonb_build_object(
      'category', cat,
      'name', item->>'name',
      'price', case when opt is not null then (opt->>'price')::numeric else null end,
      'per_guest', case when opt is not null then coalesce((opt->>'per_guest')::boolean, false) else null end,
      'items', case when opt is not null then opt->'items' else null end
    );
  end loop;

  new.snapshot := jsonb_build_object(
    'venue_name', h.name,
    'venue_id', h.id,
    'venue_base_price_used', h.price_per_day,
    'applicable_guest_tier', applicable_tier,
    'guest_count', gcount,
    'amenities', (select coalesce(jsonb_agg(k), '[]'::jsonb) from jsonb_each(coalesce(h.facilities, '{}'::jsonb)) as e(k, v) where v::text = 'true'),
    'requested_services', frozen_services,
    'advance_amount', new.advance_amount,
    'final_amount', new.amount,
    'snapshotted_at', now()
  );
  return new;
end;
$$;

drop trigger if exists customer_bookings_snapshot_hall on public.customer_bookings;
create trigger customer_bookings_snapshot_hall
  before update on public.customer_bookings
  for each row execute function public.tg_snapshot_hall_booking();
