
-- 1. Signed-in users must also be able to read public reviews
drop policy if exists creview_public_read on public.customer_reviews;
create policy creview_public_read on public.customer_reviews
  for select to anon, authenticated using (true);
grant select on public.customer_reviews to anon, authenticated;

-- 2. Keep aggregate rating / review_count in sync on the listing tables
create or replace function public.recalc_target_rating(p_kind text, p_target uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_avg numeric; v_cnt integer;
begin
  if p_target is null then return; end if;

  if p_kind = 'hall' then
    select coalesce(round(avg(rating)::numeric, 2), 0), count(*)
      into v_avg, v_cnt
      from (
        select rating from public.customer_reviews where kind = 'hall' and target_id = p_target
        union all
        select rating from public.hall_reviews where hall_id = p_target
      ) r;
    update public.halls set rating = v_avg, review_count = v_cnt where id = p_target;

  elsif p_kind = 'vendor' then
    select coalesce(round(avg(rating)::numeric, 2), 0), count(*) into v_avg, v_cnt
      from public.customer_reviews where kind = 'vendor' and target_id = p_target;
    update public.vendors set rating = v_avg, review_count = v_cnt where id = p_target;

  elsif p_kind = 'worker' then
    select coalesce(round(avg(rating)::numeric, 2), 0), count(*) into v_avg, v_cnt
      from public.customer_reviews where kind = 'worker' and target_id = p_target;
    update public.workers set rating = v_avg, review_count = v_cnt where id = p_target;
  end if;
end $$;

create or replace function public.tg_customer_review_rating()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op in ('INSERT','UPDATE') then
    perform public.recalc_target_rating(new.kind::text, new.target_id);
  end if;
  if tg_op in ('UPDATE','DELETE') then
    perform public.recalc_target_rating(old.kind::text, old.target_id);
  end if;
  return null;
end $$;

drop trigger if exists customer_review_rating on public.customer_reviews;
create trigger customer_review_rating
  after insert or update or delete on public.customer_reviews
  for each row execute function public.tg_customer_review_rating();

create or replace function public.tg_hall_review_rating()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform public.recalc_target_rating('hall', coalesce(new.hall_id, old.hall_id));
  return null;
end $$;

drop trigger if exists hall_review_rating on public.hall_reviews;
create trigger hall_review_rating
  after insert or update or delete on public.hall_reviews
  for each row execute function public.tg_hall_review_rating();

-- 3. Backfill existing aggregates
do $$
declare r record;
begin
  for r in select distinct kind::text as kind, target_id from public.customer_reviews loop
    perform public.recalc_target_rating(r.kind, r.target_id);
  end loop;
  for r in select distinct hall_id from public.hall_reviews loop
    perform public.recalc_target_rating('hall', r.hall_id);
  end loop;
end $$;
