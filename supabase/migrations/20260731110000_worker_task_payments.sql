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

-- Tracks the platform → worker payout for each paid task. Starts as a
-- manual step: admin/venue owner transfers the money (UPI/bank) outside
-- Razorpay and records the reference here. Can be automated later with
-- RazorpayX Payouts without changing this table's shape.
create table if not exists public.worker_payouts (
  id uuid primary key default gen_random_uuid(),
  worker_task_id uuid not null references public.worker_tasks(id) on delete cascade unique,
  worker_id uuid not null references public.workers(id) on delete cascade,
  amount numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending','paid')),
  payout_reference text,      -- UTR / transaction ref once paid manually
  paid_by uuid references auth.users(id),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.worker_payouts enable row level security;

-- Whoever assigned the task (and paid for it) can see the payout row.
create policy if not exists "assigner can view payout" on public.worker_payouts
  for select using (
    exists (select 1 from public.worker_tasks t where t.id = worker_task_id and t.assigned_by = auth.uid())
  );

-- The worker being paid can see their own payout rows.
create policy if not exists "worker can view own payout" on public.worker_payouts
  for select using (
    exists (select 1 from public.workers w where w.id = worker_id and w.owner_id = auth.uid())
  );

-- Only the original assigner can mark a payout as paid (manual step for now).
create policy if not exists "assigner can update payout" on public.worker_payouts
  for update using (
    exists (select 1 from public.worker_tasks t where t.id = worker_task_id and t.assigned_by = auth.uid())
  );

-- Inserts happen only from the razorpay-verify-payment Edge Function
-- (service role), never directly from the client.

-- Auto-create the payout row the moment a task's payment turns 'paid'.
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
