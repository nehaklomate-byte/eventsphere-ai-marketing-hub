-- ============================================================
-- 1) Link a hired worker/vendor to the SPECIFIC event/booking they
--    were hired for, so a venue owner opening one booking can see
--    exactly who's hired for THAT event — not a flat global list.
-- 2) Customer → Venue Owner payment for a hall booking (Flow 1),
--    reusing the same collect-then-payout pattern as worker/vendor
--    payments. This is the ONE place platform commission applies
--    (commission_amount defaults to 0 — matches the "free launch
--    phase" decision; raise it later without any schema change).
-- ============================================================

alter table public.worker_tasks add column if not exists customer_booking_id uuid references public.customer_bookings(id) on delete set null;
alter table public.vendor_tasks add column if not exists customer_booking_id uuid references public.customer_bookings(id) on delete set null;
create index if not exists worker_tasks_booking_idx on public.worker_tasks(customer_booking_id);
create index if not exists vendor_tasks_booking_idx on public.vendor_tasks(customer_booking_id);

alter table public.customer_bookings add column if not exists razorpay_order_id text;
alter table public.customer_bookings add column if not exists razorpay_payment_id text;
alter table public.customer_bookings add column if not exists paid_at timestamptz;
alter table public.customer_bookings add column if not exists commission_amount numeric(12,2) not null default 0;
create index if not exists idx_customer_bookings_razorpay_order on public.customer_bookings(razorpay_order_id);

-- Mirrors worker_payouts / vendor_payouts — what the platform owes the
-- venue owner once a customer's hall-booking payment clears.
create table if not exists public.venue_payouts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.customer_bookings(id) on delete cascade unique,
  hall_owner_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null,
  status text not null default 'pending' check (status in ('pending','paid')),
  payout_reference text,
  paid_by uuid references auth.users(id),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.venue_payouts enable row level security;

drop policy if exists "hall owner can view own payout" on public.venue_payouts;
create policy "hall owner can view own payout" on public.venue_payouts
  for select using (hall_owner_id = auth.uid());

drop policy if exists "admin can view all venue payouts" on public.venue_payouts;
create policy "admin can view all venue payouts" on public.venue_payouts
  for select using (public.has_role(auth.uid(), 'admin'));

-- Only a hall-kind booking can be paid this way; guards against
-- accidentally wiring vendor/worker customer_bookings rows through
-- this flow (those already have their own dedicated tables).
create or replace function public.tg_hall_booking_create_payout()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner_id uuid;
begin
  if new.kind <> 'hall' then
    return new;
  end if;
  if new.payment_status = 'paid' and old.payment_status is distinct from 'paid' then
    select owner_id into v_owner_id from public.halls where id = new.target_id;
    if v_owner_id is not null then
      insert into public.venue_payouts (booking_id, hall_owner_id, amount)
      values (new.id, v_owner_id, greatest(coalesce(new.amount,0) - coalesce(new.commission_amount,0), 0))
      on conflict (booking_id) do nothing;
    end if;
  end if;
  return new;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'customer_bookings_create_payout') then
    create trigger customer_bookings_create_payout after update on public.customer_bookings
      for each row execute function public.tg_hall_booking_create_payout();
  end if;
end $$;
