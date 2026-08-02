-- Payout UPI ids referenced by the payout banner
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payout_upi_id text;
ALTER TABLE public.workers  ADD COLUMN IF NOT EXISTS payout_upi_id text;
ALTER TABLE public.vendors  ADD COLUMN IF NOT EXISTS payout_upi_id text;

DO $$ BEGIN
  CREATE TYPE public.posting_status AS ENUM ('open','closed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.application_status AS ENUM ('applied','shortlisted','accepted','rejected','withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pay_type AS ENUM ('hourly','daily','per_event');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ WORKER JOB MARKETPLACE ============
CREATE TABLE IF NOT EXISTS public.worker_job_postings (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete set null,
  hall_id uuid references public.halls(id) on delete set null,
  title text not null,
  category text not null,
  description text,
  venue text,
  venue_address text,
  event_date date not null,
  start_time time,
  end_time time,
  slots_needed integer not null default 1,
  slots_filled integer not null default 0,
  pay_amount numeric,
  pay_type public.pay_type not null default 'per_event',
  status public.posting_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_job_postings TO authenticated;
GRANT ALL ON public.worker_job_postings TO service_role;
ALTER TABLE public.worker_job_postings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wjp_read ON public.worker_job_postings;
CREATE POLICY wjp_read ON public.worker_job_postings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS wjp_write ON public.worker_job_postings;
CREATE POLICY wjp_write ON public.worker_job_postings FOR ALL TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

CREATE TABLE IF NOT EXISTS public.worker_job_applications (
  id uuid primary key default gen_random_uuid(),
  posting_id uuid not null references public.worker_job_postings(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  worker_user_id uuid not null references auth.users(id) on delete cascade,
  cover_note text,
  status public.application_status not null default 'applied',
  applied_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (posting_id, worker_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_job_applications TO authenticated;
GRANT ALL ON public.worker_job_applications TO service_role;
ALTER TABLE public.worker_job_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wja_own ON public.worker_job_applications;
CREATE POLICY wja_own ON public.worker_job_applications FOR ALL TO authenticated
  USING (worker_user_id = auth.uid()) WITH CHECK (worker_user_id = auth.uid());
DROP POLICY IF EXISTS wja_poster ON public.worker_job_applications;
CREATE POLICY wja_poster ON public.worker_job_applications FOR SELECT TO authenticated
  USING (exists (select 1 from public.worker_job_postings p where p.id = posting_id and p.created_by = auth.uid()));
DROP POLICY IF EXISTS wja_poster_update ON public.worker_job_applications;
CREATE POLICY wja_poster_update ON public.worker_job_applications FOR UPDATE TO authenticated
  USING (exists (select 1 from public.worker_job_postings p where p.id = posting_id and p.created_by = auth.uid()))
  WITH CHECK (exists (select 1 from public.worker_job_postings p where p.id = posting_id and p.created_by = auth.uid()));

-- ============ VENDOR JOB MARKETPLACE ============
CREATE TABLE IF NOT EXISTS public.vendor_job_postings (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  hall_id uuid references public.halls(id) on delete set null,
  title text not null,
  category text not null,
  description text,
  venue text,
  venue_address text,
  event_date date not null,
  start_time time,
  end_time time,
  slots_needed integer not null default 1,
  slots_filled integer not null default 0,
  pay_amount numeric,
  pay_type public.pay_type not null default 'per_event',
  status public.posting_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_job_postings TO authenticated;
GRANT ALL ON public.vendor_job_postings TO service_role;
ALTER TABLE public.vendor_job_postings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vjp_read ON public.vendor_job_postings;
CREATE POLICY vjp_read ON public.vendor_job_postings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS vjp_write ON public.vendor_job_postings;
CREATE POLICY vjp_write ON public.vendor_job_postings FOR ALL TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

CREATE TABLE IF NOT EXISTS public.vendor_job_applications (
  id uuid primary key default gen_random_uuid(),
  posting_id uuid not null references public.vendor_job_postings(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  vendor_user_id uuid not null references auth.users(id) on delete cascade,
  cover_note text,
  status public.application_status not null default 'applied',
  applied_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (posting_id, vendor_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_job_applications TO authenticated;
GRANT ALL ON public.vendor_job_applications TO service_role;
ALTER TABLE public.vendor_job_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vja_own ON public.vendor_job_applications;
CREATE POLICY vja_own ON public.vendor_job_applications FOR ALL TO authenticated
  USING (vendor_user_id = auth.uid()) WITH CHECK (vendor_user_id = auth.uid());
DROP POLICY IF EXISTS vja_poster ON public.vendor_job_applications;
CREATE POLICY vja_poster ON public.vendor_job_applications FOR SELECT TO authenticated
  USING (exists (select 1 from public.vendor_job_postings p where p.id = posting_id and p.created_by = auth.uid()));
DROP POLICY IF EXISTS vja_poster_update ON public.vendor_job_applications;
CREATE POLICY vja_poster_update ON public.vendor_job_applications FOR UPDATE TO authenticated
  USING (exists (select 1 from public.vendor_job_postings p where p.id = posting_id and p.created_by = auth.uid()))
  WITH CHECK (exists (select 1 from public.vendor_job_postings p where p.id = posting_id and p.created_by = auth.uid()));

DROP TRIGGER IF EXISTS trg_wjp_updated ON public.worker_job_postings;
CREATE TRIGGER trg_wjp_updated BEFORE UPDATE ON public.worker_job_postings FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
DROP TRIGGER IF EXISTS trg_vjp_updated ON public.vendor_job_postings;
CREATE TRIGGER trg_vjp_updated BEFORE UPDATE ON public.vendor_job_postings FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();