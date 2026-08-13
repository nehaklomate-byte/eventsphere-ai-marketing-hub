-- ============================================================
-- Revenue model update (supersedes flat ₹200/₹100/₹50 pricing from the
-- previous migration — that pricing is replaced here, nothing about
-- registration, the marketplace, bookings, or existing roles changes).
--
-- 1) One-time Profile Anchor Fee — ₹300–₹400 range, admin-tunable,
--    individual freelance workers fully exempt (₹0), and only payable
--    once 2-step document verification is approved.
-- 2) 6-month free top-tier visibility for venue/vendor after
--    activation, then a recurring subscription to keep it. Per the
--    existing "marketplace listing stays free, never hidden" rule,
--    this is implemented as a RANKING boost + badge, not a filter —
--    an unsubscribed profile still appears in the free marketplace,
--    it just isn't boosted to the top anymore.
-- 3) Per-booking commission unchanged in shape (venue 5%, vendor 4%),
--    worker commission now splits: 0% individual freelancer, 3% for
--    agency-routed workers.
-- ============================================================

-- ---------- 1) Configurable pricing (admin can tune within policy) ----------
alter table public.platform_settings add column if not exists profile_anchor_fee_venue numeric(10,2) not null default 400;
alter table public.platform_settings add column if not exists profile_anchor_fee_vendor numeric(10,2) not null default 350;
alter table public.platform_settings add column if not exists profile_anchor_fee_agency_worker numeric(10,2) not null default 300;
alter table public.platform_settings add column if not exists trial_period_days integer not null default 180;
-- Subscription pricing has no figure in the spec — sensible defaults, admin should review/set these.
alter table public.platform_settings add column if not exists subscription_monthly_price numeric(10,2) not null default 499;
alter table public.platform_settings add column if not exists subscription_annual_price numeric(10,2) not null default 4999;

-- Commission split confirmed again here: venue 5%, vendor 4%, worker
-- rate now applies to agency workers only (individual = 0%, enforced
-- in the trigger below, not by this rate).
update public.platform_settings set
  commission_rate_venue = 5,
  commission_rate_vendor = 4,
  commission_rate_worker = 3;

-- ---------- 2) Trial / subscription columns (venue + vendor only) ----------
alter table public.halls   add column if not exists trial_ends_at timestamptz;
alter table public.halls   add column if not exists subscription_active boolean not null default false;
alter table public.halls   add column if not exists subscription_expires_at timestamptz;
alter table public.vendors add column if not exists trial_ends_at timestamptz;
alter table public.vendors add column if not exists subscription_active boolean not null default false;
alter table public.vendors add column if not exists subscription_expires_at timestamptz;

-- "Top-tier visibility" = activated AND (still inside the free trial OR
-- has an active paid subscription). Used only for search ranking order —
-- never for hiding a listing.
create or replace function public.has_top_tier_visibility(
  p_public_profile_active boolean, p_trial_ends_at timestamptz, p_subscription_active boolean, p_subscription_expires_at timestamptz
) returns boolean language sql immutable as $$
  select coalesce(p_public_profile_active, false) and (
    (p_trial_ends_at is not null and p_trial_ends_at > now())
    or (coalesce(p_subscription_active, false) and (p_subscription_expires_at is null or p_subscription_expires_at > now()))
  );
$$;

-- ---------- 3) Payment records now cover 3 fee types, not just activation ----------
alter table public.public_profile_payments add column if not exists feature_type text not null default 'profile_activation'
  check (feature_type in ('profile_activation', 'subscription_monthly', 'subscription_annual'));

-- ---------- 4) Worker commission: individual freelancer = 0%, agency = platform rate ----------
create or replace function public.tg_worker_task_create_payout()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_rate numeric;
  v_worker_type text;
begin
  if new.payment_status = 'paid' and old.payment_status is distinct from 'paid' then
    select worker_type into v_worker_type from public.workers where id = new.worker_id;

    if v_worker_type = 'agency' then
      select commission_rate_worker into v_rate from public.platform_settings limit 1;
    else
      v_rate := 0; -- individual freelance workers keep 100% of their earnings
    end if;

    new.commission_amount := round(coalesce(new.payment_amount, 0) * coalesce(v_rate, 0) / 100, 2);

    insert into public.worker_payouts (worker_task_id, worker_id, amount)
    values (new.id, new.worker_id, greatest(coalesce(new.payment_amount, 0) - new.commission_amount, 0))
    on conflict (worker_task_id) do nothing;
  end if;
  return new;
end $$;
