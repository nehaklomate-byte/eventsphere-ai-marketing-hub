-- ============================================================
-- Free-trial (6-month) expiry reminders for venues & vendors.
--
-- halls.trial_ends_at / vendors.trial_ends_at already exist
-- (revenue_model_v2), and the profile page already shows a banner
-- once the caller loads trialEndsAt — but nothing ever proactively
-- told the owner their trial was ending. This adds:
--   1) two "already notified" markers so we never spam the same
--      reminder twice,
--   2) a function that finds trials ending within 7 days (not yet
--      warned) and trials that have already expired without an
--      active subscription (not yet given the "expired" notice),
--      and files an in-app notification for each,
--   3) a daily pg_cron job that runs it.
-- ============================================================

alter table public.halls   add column if not exists trial_reminder_sent_at timestamptz;
alter table public.halls   add column if not exists trial_expired_notice_sent_at timestamptz;
alter table public.vendors add column if not exists trial_reminder_sent_at timestamptz;
alter table public.vendors add column if not exists trial_expired_notice_sent_at timestamptz;

do $$ begin
  alter type public.notification_category add value if not exists 'subscription_reminder';
exception when duplicate_object then null; end $$;

create or replace function public.send_trial_expiry_reminders()
returns void language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  -- ---- Venues (halls) — trial ending within 7 days ----
  for r in
    select id, owner_id, name from public.halls
    where trial_ends_at is not null
      and coalesce(subscription_active, false) = false
      and trial_ends_at between now() and now() + interval '7 days'
      and trial_reminder_sent_at is null
  loop
    insert into public.platform_notifications (user_id, title, body, type)
    values (r.owner_id, 'Your free visibility period is ending soon',
      'Your 6-month free Top-tier visibility for "' || r.name || '" ends in a few days. Subscribe to keep your listing at full visibility without interruption.',
      'warning');
    update public.halls set trial_reminder_sent_at = now() where id = r.id;
  end loop;

  -- ---- Venues (halls) — trial already ended, no subscription ----
  for r in
    select id, owner_id, name from public.halls
    where trial_ends_at is not null
      and coalesce(subscription_active, false) = false
      and trial_ends_at < now()
      and trial_expired_notice_sent_at is null
  loop
    insert into public.platform_notifications (user_id, title, body, type)
    values (r.owner_id, 'Your free visibility period has ended',
      'The 6-month free Top-tier visibility for "' || r.name || '" has ended. Subscribe now to restore full visibility.',
      'warning');
    update public.halls set trial_expired_notice_sent_at = now() where id = r.id;
  end loop;

  -- ---- Vendors — trial ending within 7 days ----
  for r in
    select id, owner_id, business_name as name from public.vendors
    where trial_ends_at is not null
      and coalesce(subscription_active, false) = false
      and trial_ends_at between now() and now() + interval '7 days'
      and trial_reminder_sent_at is null
  loop
    insert into public.vendor_notifications (user_id, category, title, body, action_url)
    values (r.owner_id, 'subscription_reminder', 'Your free visibility period is ending soon',
      'Your 6-month free Top-tier visibility for "' || r.name || '" ends in a few days. Subscribe to keep your listing at full visibility without interruption.',
      '/vendor/profile');
    update public.vendors set trial_reminder_sent_at = now() where id = r.id;
  end loop;

  -- ---- Vendors — trial already ended, no subscription ----
  for r in
    select id, owner_id, business_name as name from public.vendors
    where trial_ends_at is not null
      and coalesce(subscription_active, false) = false
      and trial_ends_at < now()
      and trial_expired_notice_sent_at is null
  loop
    insert into public.vendor_notifications (user_id, category, title, body, action_url)
    values (r.owner_id, 'subscription_reminder', 'Your free visibility period has ended',
      'The 6-month free Top-tier visibility for "' || r.name || '" has ended. Subscribe now to restore full visibility.',
      '/vendor/profile');
    update public.vendors set trial_expired_notice_sent_at = now() where id = r.id;
  end loop;
end $$;

revoke execute on function public.send_trial_expiry_reminders() from public, anon, authenticated;

-- Schedule it daily at 03:00. pg_cron ships with Supabase Postgres;
-- guard everything so this migration is safe to re-run and doesn't
-- fail on a project where the extension isn't enabled yet.
do $$ begin
  create extension if not exists pg_cron with schema extensions;
exception when insufficient_privilege then null;
end $$;

do $outer$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'trial-expiry-reminders-daily';
    perform cron.schedule('trial-expiry-reminders-daily', '0 3 * * *', $cron$select public.send_trial_expiry_reminders();$cron$);
  end if;
exception when undefined_table or insufficient_privilege then null;
end $outer$;
