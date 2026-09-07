-- Keep public news readable without granting anonymous callers is_admin().
drop policy if exists news_public on public.news_posts;
create policy news_public on public.news_posts for select to anon,authenticated using (published=true);
create policy news_admin_read on public.news_posts for select to authenticated using (public.is_admin());
grant select on public.news_posts to anon,authenticated;
