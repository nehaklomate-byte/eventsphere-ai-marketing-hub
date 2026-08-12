ALTER TABLE public.customer_bookings
ADD COLUMN IF NOT EXISTS advance_amount numeric(12,2);
