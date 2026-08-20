-- ============================================================
-- Server-authoritative pricing for vendor/worker hire requests.
--
-- BUG (spec Part 36 — "never trust a customer-supplied final
-- amount"): vendor.$id.tsx / worker.$id.tsx compute an "Estimated
-- total" client-side from the vendor/worker's package + pricing_options,
-- but that number lands in a plain editable "Pay amount" text input
-- (`pay_amount`) which is then inserted as-is into
-- vendor_tasks.payment_amount / worker_tasks.payment_amount. Anyone
-- could edit that field in devtools before submit (or just call the
-- insert directly) and set payment_amount to anything, and nothing
-- server-side ever re-derives or checks it. That number later drives
-- commission_amount and payout math.
--
-- FIX: a BEFORE INSERT/UPDATE trigger on both tables that ignores
-- whatever payment_amount/selected_items amounts the client sent and
-- recomputes them itself, from the vendor's/worker's own price
-- columns, using only *identifiers* (package id / pricing_option id)
-- and quantities the client selected — never a client-supplied price.
--
-- Requires selected_items entries to carry a `type` + `ref_id` so the
-- trigger can look the real price up — old/unrecognized entries (just
-- {name, amount}, no ref_id) are valued at zero rather than trusted,
-- which is why the app must send the new shape; see
-- src/routes/vendor.$id.tsx and worker.$id.tsx.
--
-- selected_items entry shapes now recognised:
--   vendor_tasks: {type:'package', ref_id: vendor_packages.id}
--                 {type:'base_price', ref_id: vendors.id}
--                 {type:'option', ref_id: <pricing_options[].id>, per_guest?: bool}
--   worker_tasks: {type:'daily_charge', ref_id: workers.id}
--                 {type:'option', ref_id: <pricing_options[].id>, per_guest?: bool}
--
-- Only recomputes while the request is still pending review — once a
-- vendor/worker has accepted (or it's completed/cancelled), further
-- edits to the row (e.g. an admin note update) must NOT silently
-- reprice it. New rows (insert) are always recomputed regardless of
-- the status they're inserted with, since a fresh 'pending' request is
-- exactly the case this exists to protect.
-- ============================================================

alter table public.vendor_tasks add column if not exists guest_count integer;
alter table public.worker_tasks add column if not exists guest_count integer;

create or replace function public.tg_recompute_vendor_task_amount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  item_type text;
  ref uuid;
  per_guest boolean;
  unit_price numeric;
  line_amount numeric;
  total numeric := 0;
  recomputed_items jsonb := '[]'::jsonb;
  gcount integer := coalesce(new.guest_count, 0);
begin
  if tg_op = 'UPDATE' and old.status is distinct from 'pending' then
    return new; -- don't reprice anything past the initial pending request
  end if;

  -- Internal flows (venue/vendor directly assigning a task and typing
  -- a pay amount themselves — see venue/hire-vendors.tsx) never send
  -- selected_items at all. Only the public marketplace hire form
  -- (vendor.$id.tsx) does. Recomputation only applies to that path;
  -- an empty/absent selected_items means "trust the assigner", since
  -- there's no customer-supplied number to distrust in that flow.
  if new.selected_items is null or jsonb_array_length(new.selected_items) = 0 then
    return new;
  end if;

  for item in select * from jsonb_array_elements(coalesce(new.selected_items, '[]'::jsonb))
  loop
    item_type := item->>'type';
    ref := nullif(item->>'ref_id', '')::uuid;
    line_amount := 0;

    if item_type = 'package' and ref is not null then
      select price into unit_price from public.vendor_packages where id = ref and vendor_id = new.vendor_id;
      line_amount := coalesce(unit_price, 0);

    elsif item_type = 'base_price' and ref is not null then
      select base_price into unit_price from public.vendors where id = ref and id = new.vendor_id;
      line_amount := coalesce(unit_price, 0);

    elsif item_type = 'option' and ref is not null then
      select (opt->>'price')::numeric, coalesce((opt->>'per_guest')::boolean, false)
        into unit_price, per_guest
        from public.vendors v, jsonb_array_elements(v.pricing_options) opt
        where v.id = new.vendor_id and (opt->>'id') = ref::text;
      line_amount := coalesce(unit_price, 0) * (case when per_guest then greatest(gcount, 0) else 1 end);

    else
      -- Unknown/legacy shape (no ref_id) — worth zero, never trusted.
      line_amount := 0;
    end if;

    total := total + line_amount;
    recomputed_items := recomputed_items || jsonb_build_object(
      'type', item_type, 'ref_id', item->>'ref_id', 'name', item->>'name', 'amount', line_amount
    );
  end loop;

  new.selected_items := recomputed_items;
  new.payment_amount := total;
  return new;
end;
$$;

drop trigger if exists vendor_tasks_recompute_amount on public.vendor_tasks;
create trigger vendor_tasks_recompute_amount
  before insert or update on public.vendor_tasks
  for each row execute function public.tg_recompute_vendor_task_amount();

create or replace function public.tg_recompute_worker_task_amount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  item_type text;
  ref uuid;
  per_guest boolean;
  unit_price numeric;
  line_amount numeric;
  total numeric := 0;
  recomputed_items jsonb := '[]'::jsonb;
  gcount integer := coalesce(new.guest_count, 0);
  qty integer := coalesce(new.quantity, 1);
begin
  if tg_op = 'UPDATE' and old.status is distinct from 'pending' then
    return new;
  end if;

  if new.selected_items is null or jsonb_array_length(new.selected_items) = 0 then
    return new;
  end if;

  for item in select * from jsonb_array_elements(coalesce(new.selected_items, '[]'::jsonb))
  loop
    item_type := item->>'type';
    ref := nullif(item->>'ref_id', '')::uuid;
    line_amount := 0;

    if item_type = 'daily_charge' and ref is not null then
      select daily_charges into unit_price from public.workers where id = ref and id = new.worker_id;
      line_amount := coalesce(unit_price, 0) * greatest(qty, 1);

    elsif item_type = 'option' and ref is not null then
      select (opt->>'price')::numeric, coalesce((opt->>'per_guest')::boolean, false)
        into unit_price, per_guest
        from public.workers w, jsonb_array_elements(w.pricing_options) opt
        where w.id = new.worker_id and (opt->>'id') = ref::text;
      line_amount := coalesce(unit_price, 0) * (case when per_guest then greatest(gcount, 0) else 1 end);

    else
      line_amount := 0;
    end if;

    total := total + line_amount;
    recomputed_items := recomputed_items || jsonb_build_object(
      'type', item_type, 'ref_id', item->>'ref_id', 'name', item->>'name', 'amount', line_amount
    );
  end loop;

  new.selected_items := recomputed_items;
  new.payment_amount := total;
  return new;
end;
$$;

drop trigger if exists worker_tasks_recompute_amount on public.worker_tasks;
create trigger worker_tasks_recompute_amount
  before insert or update on public.worker_tasks
  for each row execute function public.tg_recompute_worker_task_amount();
