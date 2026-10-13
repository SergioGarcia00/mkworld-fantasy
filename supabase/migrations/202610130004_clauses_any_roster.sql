-- A clause can target any rival roster player after the one-week acquisition protection.
do $$
declare src text;
begin
  select pg_get_functiondef('public.pay_player_clause(uuid,text)'::regprocedure) into src;
  src := replace(src, $needle$ if not exists(select 1 from public.market_offers where player_id=target_player and week_start=public.competition_market_week()) then raise exception 'El jugador no está en el mercado de esta semana'; end if; $needle$, '');
  execute src;
end $$;
