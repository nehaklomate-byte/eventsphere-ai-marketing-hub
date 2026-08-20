-- ============================================================
-- Hall booking payment redesign — advance now, owner-set final price,
-- balance later. Replaces the customer self-selecting add-ons and a
-- price being auto-computed from those selections at request time.
--
-- New flow:
--   1. Customer submits a booking REQUEST — no price is computed or
--      shown to them at this point (amount starts NULL — "not decided
--      yet"). They just describe the event (dates, guest count,
--      contact info).
--   2. Venue owner reviews it and, when confirming, sets the ADVANCE
--      amount for this specific booking (defaults to the hall's usual
--      advance_amount, but editable per booking).
--   3. Customer pays the advance. payment_status becomes 'partial'
--      (this enum value already existed, unused until now) —
--      advance_paid_amount records exactly how much came in.
--   4. Whenever the owner has finalised everything with the customer
--      (outside the app, by call/in person, however they do it), the
--      owner enters the WHOLE final price into `amount`.
--   5. The customer then sees "Pending: ₹(amount - advance_paid_amount)"
--      and pays that balance. Once paid, payment_status = 'paid' —
--      same as any other booking, so the existing commission trigger
--      and everything downstream (receipts, payouts) needs no changes.
-- ============================================================

alter table public.customer_bookings alter column amount drop not null;
alter table public.customer_bookings alter column amount drop default;
alter table public.customer_bookings add column if not exists advance_paid_amount numeric(12,2) not null default 0;
alter table public.customer_bookings add column if not exists advance_razorpay_payment_id text;
alter table public.customer_bookings add column if not exists final_price_set_at timestamptz;

comment on column public.customer_bookings.amount is
  'The WHOLE final price for a hall booking — set by the venue owner after confirming, not computed from customer selections. NULL until the owner sets it. For vendor/worker kinds this column is unused (they price via payment_amount on their own task tables).';
comment on column public.customer_bookings.advance_amount is
  'Advance requested for THIS specific booking, set by the venue owner at confirm time (defaults to the hall''s profile advance_amount but can be adjusted per booking).';
comment on column public.customer_bookings.advance_paid_amount is
  'How much of the advance has actually been paid via Razorpay. Compared against advance_amount and amount to compute what''s still pending.';
