-- Corrección económica de Jornada 1 para El Graco. La alineación histórica
-- se añadió después del cierre, por lo que solo faltaba su recompensa por puntos.
do $$
declare
  team_id uuid;
  round_id uuid;
  points numeric;
  reward bigint;
  money_rate bigint;
  before_balance bigint;
  after_balance bigint;
  payment_key text;
begin
  select ft.id, s.matchday_id, s.points
    into team_id, round_id, points
  from public.fantasy_teams ft
  join public.leagues lg on lg.id = ft.league_id
  join public.fantasy_team_matchday_scores s on s.fantasy_team_id = ft.id
  join public.matchdays md on md.id = s.matchday_id
    and md.season_id = lg.season_id
    and md.number = 1
  where ft.name = 'El Graco'
  limit 1;

  if team_id is null then
    raise exception 'No se encontró el equipo o la puntuación de Graco';
  end if;

  select c.money_per_point,
    least(
    greatest(0, floor(points)::bigint) * c.money_per_point,
    c.max_money_from_points_per_round
    ) into money_rate, reward
  from public.app_config c
  where c.id = true;

  payment_key := 'round:' || round_id || ':team:' || team_id || ':points';

  if not exists (
    select 1 from public.fantasy_transactions
    where idempotency_key = payment_key
  ) then
    select budget into before_balance
    from public.fantasy_teams
    where id = team_id
    for update;

    after_balance := before_balance + reward;
    update public.fantasy_teams set budget = after_balance where id = team_id;

    insert into public.fantasy_transactions(
      fantasy_team_id, round_id, type, amount, balance_before, balance_after,
      description, metadata, idempotency_key
    ) values (
      team_id, round_id, 'ROUND_POINTS_REWARD', reward,
      before_balance, after_balance,
      'Recompensa por ' || points || ' puntos',
      jsonb_build_object(
        'points', points,
        'moneyPerPoint', money_rate,
        'appliedReward', reward,
        'manualCorrection', true
      ),
      payment_key
    );
  end if;
end $$;
