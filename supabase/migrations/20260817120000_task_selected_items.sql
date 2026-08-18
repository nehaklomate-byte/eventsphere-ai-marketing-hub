-- ============================================================
-- Itemized receipts for vendor/worker bookings — previously the
-- customer's selected package + add-ons were only saved as a plain
-- text summary in `description` (readable by the vendor/worker, but
-- not structured enough for the receipt page to render a proper
-- line-item breakdown the way the hall receipt already does from
-- customer_bookings.details.selected_services).
--
-- Shape: [{ "name": "Extra hour", "amount": 2000 }, ...]
-- ============================================================

alter table public.vendor_tasks add column if not exists selected_items jsonb not null default '[]'::jsonb;
alter table public.worker_tasks add column if not exists selected_items jsonb not null default '[]'::jsonb;
