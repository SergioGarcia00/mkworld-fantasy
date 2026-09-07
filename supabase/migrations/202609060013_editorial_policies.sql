-- Admin write policies for editorial content.
create policy news_admin_insert on public.news_posts for insert to authenticated with check(public.is_admin());
create policy news_admin_update on public.news_posts for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy news_admin_delete on public.news_posts for delete to authenticated using(public.is_admin());
