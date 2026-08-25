-- ============================================================
-- Vendor/Worker hiring — fee negotiation + service linkage + attachments.
--
-- Part 1 of the EventOrbit Nova hiring-flow spec. What already existed
-- before this migration (nothing here duplicates it):
--   - vendor_tasks/worker_tasks.customer_booking_id links an assignment
--     back to the confirmed hall booking (20260802100000).
--   - customer_bookings.details.requested_services holds each service
--     the customer asked about, with a per-service requirement_note
--     (src/components/HallBookingForm.tsx).
--   - vendor_tasks/worker_tasks.customer_requirements text column
--     already exists to carry that note through (20260823110000), it's
--     just never populated by the hire-vendors/hire-workers screens yet
--     (a UI-layer gap, fixed separately — no schema change needed there).
--   - Commission is already computed live off payment_amount the
--     instant payment_status flips to 'paid' (20260806100000) — left
--     untouched on purpose.
--
-- What's genuinely missing, and what this migration adds:
--
-- 1) Negotiation. Today a venue owner types one number into
--    "Pay amount" and the vendor/worker can only accept or reject it
--    — there's no counter-offer. Adds:
--      proposed_fee          — what the venue owner first offers
--      final_fee              — the locked, agreed amount (may equal
--                                proposed_fee, or an accepted counter)
--      counter_offer_amount / counter_offer_note / counter_offer_by
--      counter_offered_at, fee_locked_at
--    plus a new 'countered' status and a trigger enforcing exactly the
--    transitions the spec calls for (Part 16), each restricted to the
--    correct side of the deal (only the vendor/worker can counter or
--    accept/reject the *original* offer; only the assigner can
--    accept/reject a *counter*) — closes a real gap, since the current
--    RLS policies let either party set the row to any status.
--
-- 2) Immutability. Once final_fee is set, the trigger blocks any
--    further edit to the fee/negotiation columns — "a later profile
--    price change must never touch an already-confirmed assignment"
--    (spec Part 27), enforced at the row level, not just by convention.
--
-- 3) payment_amount stays in sync (= final_fee once locked, else
--    proposed_fee) ONLY for the internal hire flow (selected_items
--    empty) so the existing commission/payout triggers, which read
--    payment_amount, need no changes. The marketplace direct-book flow
--    (selected_items populated) is untouched — no negotiation there,
--    a customer books a vendor's own posted price directly.
--
-- 4) Service linkage — which of the customer's requested_services this
--    assignment fulfils (service_category/service_name), so the hire
--    screens can show a picker instead of a free-text task name, and
--    so duplicate-assignment checks and the venue owner's per-event
--    dashboard can group by service (spec Parts 7, 30, 32).
--
-- 5) attachments — reference files the venue owner forwards from the
--    customer's booking (need-to-know subset, not the whole upload
--    set — spec Part 9). Reuses the existing shared `attachments`
--    bucket/shape from 20260823110000. customer_bookings gets its own
--    attachments column too, since customers currently have nowhere
--    to upload reference images/menus/PDFs at all.
--
-- 6) worker pricing_unit (per worker/day/shift/job — spec Part 21).
-- ============================================================

-- ---------- 1. negotiation status ----------
do $$ begin
  alter type public.task_status add value if not exists 'countered';
exception when duplicate_object then null; end $$;

-- ---------- 2. new columns ----------
alter table public.vendor_tasks add column if not exists service_category text;
alter table public.vendor_tasks add column if not exists service_name text;
alter table public.vendor_tasks add column if not exists proposed_fee numeric(10,2);
alter table public.vendor_tasks add column if not exists final_fee numeric(10,2);
alter table public.vendor_tasks add column if not exists counter_offer_amount numeric(10,2);
alter table public.vendor_tasks add column if not exists counter_offer_note text;
alter table public.vendor_tasks add column if not exists counter_offer_by uuid references auth.users(id);
alter table public.vendor_tasks add column if not exists counter_offered_at timestamptz;
alter table public.vendor_tasks add column if not exists fee_locked_at timestamptz;
alter table public.vendor_tasks add column if not exists attachments jsonb not null default '[]'::jsonb;

alter table public.worker_tasks add column if not exists service_category text;
alter table public.worker_tasks add column if not exists service_name text;
alter table public.worker_tasks add column if not exists proposed_fee numeric(10,2);
alter table public.worker_tasks add column if not exists final_fee numeric(10,2);
alter table public.worker_tasks add column if not exists counter_offer_amount numeric(10,2);
alter table public.worker_tasks add column if not exists counter_offer_note text;
alter table public.worker_tasks add column if not exists counter_offer_by uuid references auth.users(id);
alter table public.worker_tasks add column if not exists counter_offered_at timestamptz;
alter table public.worker_tasks add column if not exists fee_locked_at timestamptz;
alter table public.worker_tasks add column if not exists attachments jsonb not null default '[]'::jsonb;
alter table public.worker_tasks add column if not exists pricing_unit text not null default 'per_worker'
  check (pricing_unit in ('per_worker','per_day','per_shift','per_job'));

alter table public.customer_bookings add column if not exists attachments jsonb not null default '[]'::jsonb;

comment on column public.vendor_tasks.proposed_fee is 'What the venue owner first offered. Never shown to the customer, never derived from the customer''s service price.';
comment on column public.vendor_tasks.final_fee is 'Locked the moment the vendor accepts (or the assigner accepts the vendor''s counter). Immutable after that — see tg_vendor_task_negotiate.';
comment on column public.worker_tasks.proposed_fee is 'Total offered (already quantity/unit-adjusted). Never shown to the customer.';
comment on column public.worker_tasks.final_fee is 'Locked the moment the worker/agency accepts (or the assigner accepts their counter). Immutable after that.';

-- Backfill existing rows so nothing already in flight breaks: treat
-- whatever payment_amount already holds as the proposed fee, and if
-- the row is already past negotiation, freeze it as the final fee too.
update public.vendor_tasks set proposed_fee = payment_amount where proposed_fee is null and payment_amount is not null;
update public.vendor_tasks set final_fee = payment_amount, fee_locked_at = coalesce(accepted_at, updated_at)
  where final_fee is null and payment_amount is not null and status not in ('pending','rejected','cancelled');

update public.worker_tasks set proposed_fee = payment_amount where proposed_fee is null and payment_amount is not null;
update public.worker_tasks set final_fee = payment_amount, fee_locked_at = coalesce(accepted_at, updated_at)
  where final_fee is null and payment_amount is not null and status not in ('pending','rejected','cancelled');

-- ---------- 3. negotiation state machine + fee lock + payment_amount sync ----------
-- Shared logic, parameterised by which "user" column identifies the
-- vendor/worker side (party_user_id) so one function serves both
-- tables instead of duplicating it twice.
create or replace function public.tg_partner_task_negotiate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  party_user_id uuid;
  is_party boolean;
  is_assigner boolean;
begin
  party_user_id := case tg_table_name when 'vendor_tasks' then new.vendor_user_id else new.worker_user_id end;
  is_party := auth.uid() = party_user_id;
  is_assigner := auth.uid() = new.assigned_by;

  if tg_op = 'INSERT' then
    if new.proposed_fee is null then
      new.proposed_fee := new.payment_amount;
    end if;
    -- Marketplace direct-book flow (selected_items populated) has no
    -- negotiation — leave payment_amount to the existing recompute
    -- trigger and don't touch it here.
    if new.selected_items is null or jsonb_array_length(new.selected_items) = 0 then
      new.payment_amount := new.proposed_fee;
    end if;
    return new;
  end if;

  -- fee lock: once set, the negotiation/fee columns are frozen for
  -- everyone except the service role (admin tooling / support fixes).
  if old.fee_locked_at is not null and auth.uid() is not null then
    if new.proposed_fee is distinct from old.proposed_fee
      or new.final_fee is distinct from old.final_fee
      or new.counter_offer_amount is distinct from old.counter_offer_amount
      or new.service_category is distinct from old.service_category
      or new.service_name is distinct from old.service_name then
      raise exception 'This assignment''s fee is locked and can no longer be changed.' using errcode = 'P0001';
    end if;
  end if;

  if new.status is distinct from old.status then
    if old.status = 'pending' and new.status = 'countered' then
      if not is_party then
        raise exception 'Only the vendor/worker can counter-offer.' using errcode = 'P0001';
      end if;
      if new.counter_offer_amount is null then
        raise exception 'Counter offer needs an amount.' using errcode = 'P0001';
      end if;
      new.counter_offer_by := auth.uid();
      new.counter_offered_at := now();

    elsif old.status = 'pending' and new.status = 'accepted' then
      if not is_party then
        raise exception 'Only the vendor/worker can accept this request.' using errcode = 'P0001';
      end if;
      new.final_fee := old.proposed_fee;
      new.fee_locked_at := now();

    elsif old.status = 'pending' and new.status = 'rejected' then
      if not is_party then
        raise exception 'Only the vendor/worker can reject this request.' using errcode = 'P0001';
      end if;

    elsif old.status = 'countered' and new.status = 'accepted' then
      if not is_assigner then
        raise exception 'Only the venue owner can accept a counter-offer.' using errcode = 'P0001';
      end if;
      new.final_fee := old.counter_offer_amount;
      new.fee_locked_at := now();

    elsif old.status = 'countered' and new.status = 'rejected' then
      if not is_assigner then
        raise exception 'Only the venue owner can reject a counter-offer.' using errcode = 'P0001';
      end if;

    elsif old.status in ('pending','countered') and new.status = 'cancelled' then
      if not is_assigner then
        raise exception 'Only the venue owner can cancel a request that hasn''t been accepted yet.' using errcode = 'P0001';
      end if;

    elsif old.status = 'accepted' and new.status in ('in_progress','paused','completed','cancelled') then
      null; -- existing lifecycle, unrelated to negotiation — unchanged
    elsif old.status = 'in_progress' and new.status in ('paused','completed','cancelled') then
      null;
    elsif old.status = 'paused' and new.status in ('in_progress','cancelled') then
      null;
    else
      raise exception 'Cannot move this assignment from % to %.', old.status, new.status using errcode = 'P0001';
    end if;
  end if;

  if new.selected_items is null or jsonb_array_length(new.selected_items) = 0 then
    new.payment_amount := coalesce(new.final_fee, new.proposed_fee, new.payment_amount);
  end if;

  return new;
end;
$$;

drop trigger if exists vendor_tasks_negotiate on public.vendor_tasks;
create trigger vendor_tasks_negotiate before insert or update on public.vendor_tasks
  for each row execute function public.tg_partner_task_negotiate();

drop trigger if exists worker_tasks_negotiate on public.worker_tasks;
create trigger worker_tasks_negotiate before insert or update on public.worker_tasks
  for each row execute function public.tg_partner_task_negotiate();
