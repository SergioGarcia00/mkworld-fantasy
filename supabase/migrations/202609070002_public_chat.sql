-- Public chat exposes only visible messages and display names, never accounts.
create or replace function public.spectator_chat()
returns table(id uuid,body text,created_at timestamptz,display_name text)
language sql stable security definer set search_path='' as $$
 select m.id,m.body,m.created_at,p.display_name
 from public.chat_messages m join public.profiles p on p.id=m.user_id
 where m.deleted_at is null and exists(select 1 from public.official_league() o where o.is_public)
 order by m.created_at desc limit 50;
$$;
revoke all on function public.spectator_chat() from public;
grant execute on function public.spectator_chat() to anon,authenticated;
