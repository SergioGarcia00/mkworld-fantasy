-- Administrators need to review every participant submission before validation.
-- The existing owner policy intentionally limits participants to their own rows;
-- this additional policy grants read-only visibility to administrators.
drop policy if exists weekly_inputs_admin_read on public.player_weekly_inputs;
create policy weekly_inputs_admin_read
  on public.player_weekly_inputs
  for select
  to authenticated
  using (public.is_admin());
