-- Keep clause protection available for every roster player by qualifying the
-- players.market_value reference in the protection function. The function
-- returns a market_value column, so an unqualified reference is ambiguous.
do $$
declare
  src text;
begin
  select pg_get_functiondef('public.protect_player_clause(uuid,uuid,bigint,text)'::regprocedure)
    into src;
  src := replace(
    src,
    'select market_value into strict v from public.players',
    'select public.players.market_value into strict v from public.players'
  );
  execute src;
end $$;
