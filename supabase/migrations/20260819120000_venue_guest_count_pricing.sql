-- ============================================================
-- Venue dynamic pricing — guest-count tiers.
--
-- Problem (spec section 2-3): halls.price_per_day was always shown
-- and charged as ONE fixed number regardless of guest count, even
-- though a real venue routinely charges differently for 50 vs 300
-- guests. price_per_day now becomes the STARTING/base price (used
-- when no tiers are configured, or as the fallback below the first
-- tier) — marketplace/hall wording already correctly says "Starting
-- from ₹X" (no change needed there), this migration makes the actual
-- quote calculation respect guest count too, not just the wording.
--
-- Kept intentionally simple (per spec: "do not create duplicate
-- tables/functions if existing structures can be corrected safely")
-- — one jsonb array on halls, same pattern already used for
-- service_offerings. Each tier: { max_guests, price }. The customer's
-- guest_count picks the first tier whose max_guests they fit under;
-- price_per_day is still the fallback if no tier matches or none are
-- configured, so existing venues with no tiers set keep working
-- exactly as before — nothing breaks for venues that don't opt in.
-- ============================================================

alter table public.halls add column if not exists guest_pricing_tiers jsonb not null default '[]'::jsonb;

comment on column public.halls.guest_pricing_tiers is
  'Array of {max_guests: number, price: number}, sorted ascending by max_guests. '
  'The base venue price for a booking = the price of the first tier whose max_guests '
  '>= the customer''s guest_count; falls back to price_per_day if empty or no tier fits.';

-- Server-side helper — reused by the SQL compute below AND kept
-- callable directly (e.g. from a future edge function or report) so
-- the tier-selection logic only ever lives in one place, never
-- reimplemented per-screen.
create or replace function public.resolve_hall_base_price(p_hall_id uuid, p_guest_count integer)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare
  v_base numeric;
  v_tiers jsonb;
  v_tier jsonb;
  v_price numeric;
begin
  select price_per_day, guest_pricing_tiers into v_base, v_tiers from public.halls where id = p_hall_id;
  if v_tiers is null or jsonb_array_length(v_tiers) = 0 or p_guest_count is null then
    return coalesce(v_base, 0);
  end if;

  for v_tier in select * from jsonb_array_elements(v_tiers) order by (value->>'max_guests')::numeric asc loop
    if p_guest_count <= (v_tier->>'max_guests')::numeric then
      return (v_tier->>'price')::numeric;
    end if;
  end loop;

  -- guest_count is above every configured tier — use the highest tier's
  -- price rather than silently falling back to the (lower) base price.
  select (value->>'price')::numeric into v_price
  from jsonb_array_elements(v_tiers)
  order by (value->>'max_guests')::numeric desc
  limit 1;
  return coalesce(v_price, v_base, 0);
end $$;

revoke execute on function public.resolve_hall_base_price(uuid, integer) from public, anon;
grant execute on function public.resolve_hall_base_price(uuid, integer) to authenticated;
