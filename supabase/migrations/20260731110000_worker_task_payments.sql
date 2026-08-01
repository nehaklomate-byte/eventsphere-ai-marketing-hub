-- ============================================================
-- Worker task payments (Razorpay) — Model B (platform collects
-- into its own account, pays worker out separately, starts manual).
--
-- No platform commission on worker_tasks — decided: platform takes
-- 0% from workers, worker gets the full payment_amount. Commission
-- only applies to venue-owner hall bookings (separate, later).
-- ============================================================

alter table public.worker_tasks
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','paid','refunded')),
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_payment_id text,
  add column if not exists paid_at timestamptz;

create index if not exists idx_worker_tasks_razorpay_order on public.worker_tasks(razorpay_order_id);

create table if not exists public.worker_payouts (
  id uuid primary key default gen_random_uuid(),
  worker_task_id uuid not null references public.worker_tasks(id) on delete cascade unique,
  worker_id uuid not null references public.workers(id) on delete cascade,
  amount numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending','paid')),
  payout_reference text,
  paid_by uuid references auth.users(id),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.worker_payouts enable row level security;

drop policy if exists "assigner can view payout" on public.worker_payouts;
create policy "assigner can view payout" on public.worker_payouts
  for select using (
    exists (select 1 from public.worker_tasks t where t.id = worker_task_id and t.assigned_by = auth.uid())
  );

drop policy if exists "worker can view own payout" on public.worker_payouts;
create policy "worker can view own payout" on public.worker_payouts
  for select using (
    exists (select 1 from public.workers w where w.id = worker_id and w.owner_id = auth.uid())
  );

drop policy if exists "assigner can update payout" on public.worker_payouts;
create policy "assigner can update payout" on public.worker_payouts
  for update using (
    exists (select 1 from public.worker_tasks t where t.id = worker_task_id and t.assigned_by = auth.uid())
  );

create or replace function public.tg_worker_task_create_payout()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.payment_status = 'paid' and old.payment_status is distinct from 'paid' then
    insert into public.worker_payouts (worker_task_id, worker_id, amount)
    values (new.id, new.worker_id, coalesce(new.payment_amount, 0))
    on conflict (worker_task_id) do nothing;
  end if;
  return new;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'worker_tasks_create_payout') then
    create trigger worker_tasks_create_payout after update on public.worker_tasks
      for each row execute function public.tg_worker_task_create_payout();
  end if;
end $$;
