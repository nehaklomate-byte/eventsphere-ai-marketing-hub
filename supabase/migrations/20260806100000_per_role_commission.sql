-- ============================================================
-- Per-role commission: admin sets a separate % for venue, vendor,
-- worker bookings. Calculated automatically the moment a payment
-- clears — platform's cut and the role's payout amount are both
-- computed right then, live, using whatever rate is set at that time.
--
-- NOTE — what this does NOT do: it does not move money anywhere by
-- itself. It only calculates who owes what. Actually sending money to
-- a worker/vendor/venue owner's bank/UPI is still the existing manual
-- payout step (admin transfers, then marks the payout row paid) —
-- true automatic bank transfer needs Razorpay Route with each party
-- KYC-verified as a linked account, which is a separate future project.
-- ============================================================

alter table public.platform_settings rename column commission_rate to commission_rate_venue;
alter table public.platform_settings add column if not exists commission_rate_vendor numeric(5,2) not null default 0 check (commission_rate_vendor >= 0 and commission_rate_vendor <= 100);
alter table public.platform_settings add column if not exists commission_rate_worker numeric(5,2) not null default 0 check (commission_rate_worker >= 0 and commission_rate_worker <= 100);

alter table public.worker_tasks add column if not exists commission_amount numeric(10,2) not null default 0;
alter table public.vendor_tasks add column if not exists commission_amount numeric(10,2) not null default 0;

-- ---- Hall booking trigger: just renamed the column it reads ----
create or replace function public.tg_hall_booking_create_payout()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner_id uuid;
  v_rate numeric;
begin
  if new.kind <> 'hall' then
    return new;
  end if;
  if new.payment_status = 'paid' and old.payment_status is distinct from 'paid' then
    select commission_rate_venue into v_rate from public.platform_settings limit 1;
    new.commission_amount := round(coalesce(new.amount, 0) * coalesce(v_rate, 0) / 100, 2);

    select owner_id into v_owner_id from public.halls where id = new.target_id;
    if v_owner_id is not null then
      insert into public.venue_payouts (booking_id, hall_owner_id, amount)
      values (new.id, v_owner_id, greatest(coalesce(new.amount, 0) - new.commission_amount, 0))
      on conflict (booking_id) do nothing;
    end if;
  end if;
  return new;
end $$;

-- ---- Worker payout: now BEFORE UPDATE too, computes commission_amount live ----
drop trigger if exists worker_tasks_create_payout on public.worker_tasks;

create or replace function public.tg_worker_task_create_payout()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_rate numeric;
begin
  if new.payment_status = 'paid' and old.payment_status is distinct from 'paid' then
    select commission_rate_worker into v_rate from public.platform_settings limit 1;
    new.commission_amount := round(coalesce(new.payment_amount, 0) * coalesce(v_rate, 0) / 100, 2);

    insert into public.worker_payouts (worker_task_id, worker_id, amount)
    values (new.id, new.worker_id, greatest(coalesce(new.payment_amount, 0) - new.commission_amount, 0))
    on conflict (worker_task_id) do nothing;
  end if;
  return new;
end $$;

create trigger worker_tasks_create_payout before update on public.worker_tasks
  for each row execute function public.tg_worker_task_create_payout();

-- ---- Vendor payout: same treatment ----
drop trigger if exists vendor_tasks_create_payout on public.vendor_tasks;

create or replace function public.tg_vendor_task_create_payout()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_rate numeric;
begin
  if new.payment_status = 'paid' and old.payment_status is distinct from 'paid' then
    select commission_rate_vendor into v_rate from public.platform_settings limit 1;
    new.commission_amount := round(coalesce(new.payment_amount, 0) * coalesce(v_rate, 0) / 100, 2);

    insert into public.vendor_payouts (vendor_task_id, vendor_id, amount)
    values (new.id, new.vendor_id, greatest(coalesce(new.payment_amount, 0) - new.commission_amount, 0))
    on conflict (vendor_task_id) do nothing;
  end if;
  return new;
end $$;

create trigger vendor_tasks_create_payout before update on public.vendor_tasks
  for each row execute function public.tg_vendor_task_create_payout();
