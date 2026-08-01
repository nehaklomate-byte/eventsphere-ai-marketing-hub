-- ============================================================
-- Payout details — collected AFTER first-time admin approval, from
-- the person's own dashboard, not at registration. One field only
-- (UPI ID) — the lightest way to identify where to send money in
-- India. Used for now by the manual payout step (admin reads this
-- and transfers); later the same field plugs straight into
-- RazorpayX Payouts for automatic transfer, no schema change needed.
-- ============================================================

alter table public.workers add column if not exists payout_upi_id text;
alter table public.vendors add column if not exists payout_upi_id text;
alter table public.profiles add column if not exists payout_upi_id text; -- venue owner receives as themself, not per-hall
