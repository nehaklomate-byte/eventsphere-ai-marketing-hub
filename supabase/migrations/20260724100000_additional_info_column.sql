-- Generic, flexible "extra info" bucket for each role table — avoids
-- needing a new migration every time a new optional field is wanted.
-- Used first by the Venue Owner profile's new "Additional Details" section.
do $$
declare
  t text;
begin
  foreach t in array array['organizations', 'halls', 'vendors', 'workers'] loop
    execute format('alter table public.%I add column if not exists additional_info jsonb not null default ''{}''::jsonb', t);
  end loop;
end $$;
