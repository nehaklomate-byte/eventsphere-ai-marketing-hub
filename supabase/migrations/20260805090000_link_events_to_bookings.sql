-- ============================================================
-- Links a customer's event (customer_events) to whatever gets
-- booked/hired for it — hall booking, workers, vendors — so the
-- event detail page can show everything for that event in one place.
-- ============================================================

alter table public.customer_bookings add column if not exists customer_event_id uuid references public.customer_events(id) on delete set null;
alter table public.worker_tasks add column if not exists customer_event_id uuid references public.customer_events(id) on delete set null;
alter table public.vendor_tasks add column if not exists customer_event_id uuid references public.customer_events(id) on delete set null;

create index if not exists customer_bookings_event_idx on public.customer_bookings(customer_event_id);
create index if not exists worker_tasks_customer_event_idx on public.worker_tasks(customer_event_id);
create index if not exists vendor_tasks_customer_event_idx on public.vendor_tasks(customer_event_id);
