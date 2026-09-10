create or replace function public.admin_rename_participant_team(target_user uuid, team_name text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_admin() then raise exception 'Solo administradores'; end if;
  if length(btrim(team_name)) not between 1 and 80 then raise exception 'Nombre de equipo inválido'; end if;
  update public.fantasy_teams f set name=btrim(team_name)
  where f.user_id=target_user and f.league_id=(select official_league_id from public.app_config where id=true);
  if not found then raise exception 'El participante no está inscrito'; end if;
end $$;
create or replace function public.admin_remove_participant(target_user uuid)
returns void language plpgsql security definer set search_path='' as $$
declare league uuid;
begin
  if not public.is_admin() then raise exception 'Solo administradores'; end if;
  select official_league_id into league from public.app_config where id=true;
  delete from public.fantasy_transactions where fantasy_team_id in (select id from public.fantasy_teams where user_id=target_user and league_id=league);
  delete from public.fantasy_team_matchday_scores where fantasy_team_id in (select id from public.fantasy_teams where user_id=target_user and league_id=league);
  delete from public.fantasy_lineup_players where lineup_id in (select id from public.fantasy_lineups where fantasy_team_id in (select id from public.fantasy_teams where user_id=target_user and league_id=league));
  delete from public.fantasy_lineups where fantasy_team_id in (select id from public.fantasy_teams where user_id=target_user and league_id=league);
  delete from public.fantasy_roster_players where fantasy_team_id in (select id from public.fantasy_teams where user_id=target_user and league_id=league);
  delete from public.fantasy_teams where user_id=target_user and league_id=league;
  delete from public.league_members where user_id=target_user and league_id=league;
end $$;
revoke all on function public.admin_rename_participant_team(uuid,text),public.admin_remove_participant(uuid) from public,anon;
grant execute on function public.admin_rename_participant_team(uuid,text),public.admin_remove_participant(uuid) to authenticated;
