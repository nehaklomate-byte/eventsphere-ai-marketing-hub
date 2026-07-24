-- Admin needs to read every user's profile + role to power the "Users" list.
-- Without this, only a user's own profile row was ever visible (per the
-- existing owner-only policies) — an admin querying public.profiles for
-- anyone else got zero rows back, the same gap pattern fixed earlier for
-- organizations/halls/vendors/workers.

drop policy if exists "Admin reads all profiles" on public.profiles;
create policy "Admin reads all profiles" on public.profiles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admin reads all user_roles" on public.user_roles;
create policy "Admin reads all user_roles" on public.user_roles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
