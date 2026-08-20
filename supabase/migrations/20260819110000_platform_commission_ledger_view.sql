-- ============================================================
-- Unified commission ledger — single source of truth for reconciliation.
--
-- Spec problem: commission/payment numbers were computed independently
-- in different places (admin.ts fetchIncomingPayments, fetchPayouts,
-- fetchEventFinancials each re-derived their own totals client-side).
-- If any one of those had a bug (like the commission_amount:0 bug we
-- already fixed), its numbers would silently disagree with the others
-- with no way to tell which one was right.
--
-- Fix — WITHOUT duplicating data into a new table (which would just
-- create a second copy that can drift out of sync): a single database
-- VIEW that unions the three paid revenue sources (hall bookings,
-- vendor tasks, worker tasks) with their real commission_amount and
-- matching payout status, computed the same way every time, straight
-- from the existing tables. Every screen (admin Earnings, a future
-- reconciliation report, CSV export) should read FROM THIS VIEW
-- instead of re-deriving totals independently.
-- ============================================================

create or replace view public.platform_commission_ledger as
select
  'hall'::text as source_type,
  b.id as source_id,
  b.customer_event_id,
  b.target_name as counterparty_label,
  b.amount as gross_amount,
  b.commission_amount as commission_amount,
  greatest(b.amount - b.commission_amount, 0) as partner_net_amount,
  b.payment_status::text,
  vp.status as payout_status,
  vp.id as payout_id,
  b.razorpay_payment_id,
  b.paid_at,
  b.created_at
from public.customer_bookings b
left join public.venue_payouts vp on vp.booking_id = b.id
where b.kind = 'hall'

union all

select
  'vendor'::text,
  t.id,
  t.customer_event_id,
  coalesce(v.business_name, 'Vendor') || ' — ' || t.task_name,
  t.payment_amount,
  t.commission_amount,
  greatest(coalesce(t.payment_amount, 0) - coalesce(t.commission_amount, 0), 0),
  t.payment_status::text,
  vpo.status,
  vpo.id,
  t.razorpay_payment_id,
  t.paid_at,
  t.created_at
from public.vendor_tasks t
left join public.vendors v on v.id = t.vendor_id
left join public.vendor_payouts vpo on vpo.vendor_task_id = t.id

union all

select
  'worker'::text,
  t.id,
  t.customer_event_id,
  coalesce(w.full_name, 'Worker') || ' — ' || t.task_name,
  t.payment_amount,
  t.commission_amount,
  greatest(coalesce(t.payment_amount, 0) - coalesce(t.commission_amount, 0), 0),
  t.payment_status::text,
  wpo.status,
  wpo.id,
  t.razorpay_payment_id,
  t.paid_at,
  t.created_at
from public.worker_tasks t
left join public.workers w on w.id = t.worker_id
left join public.worker_payouts wpo on wpo.worker_task_id = t.id;

-- RLS on the underlying tables already restricts what admin/owners see
-- via `security_invoker`, so this view runs with the querying user's
-- own permissions/RLS, not the view owner's — an admin sees every row,
-- a venue/vendor/worker only sees what their existing RLS already
-- allows on the base tables.
alter view public.platform_commission_ledger set (security_invoker = true);

grant select on public.platform_commission_ledger to authenticated;
