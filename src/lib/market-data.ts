import 'server-only';
/* Dynamic relations are validated by PostgreSQL; generated types cover core tables only. */
/* eslint-disable @typescript-eslint/no-explicit-any */

export async function loadMarket(db: any, userId: string, week: string) {
  // Each branch starts immediately; only dependent queries wait for their parent.
  const [offers, squad, counts, mine] = await Promise.all([
    (async () => {
      const { data, error } = await db
        .from('market_offers')
        .select(
          'id,slot,mmr,player_id,players(name,slug,market_value,initial_value,mkcentral_player_id,nationality,teams(name))',
        )
        .eq('week_start', week)
        .order('slot');
      if (error) throw new Error('No se pudieron cargar las ofertas.');
      const rows: any[] = data ?? [];
      const ids = rows.flatMap((offer) =>
        offer.players?.mkcentral_player_id == null
          ? []
          : [String(offer.players.mkcentral_player_id)],
      );
      const { data: details } = ids.length
        ? await db
            .from('player_enriched_details')
            .select('mkcentral_player_id,display_name,country,tier')
            .eq('season_number', 3)
            .in('mkcentral_player_id', ids)
        : { data: [] };
      const byId = new Map(
        (details ?? []).map((row: any) => [String(row.mkcentral_player_id), row]),
      );
      return rows.map((offer) => ({
        ...offer,
        detail: byId.get(String(offer.players?.mkcentral_player_id)),
      }));
    })(),
    (async () => {
      const { data: team, error } = await db
        .from('fantasy_teams')
        .select('id,budget')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw new Error('No se pudo cargar tu equipo.');
      const { data: owned, error: rosterError } = team
        ? await db
            .from('fantasy_roster_players')
            .select('player_id,players(market_value)')
            .eq('fantasy_team_id', team.id)
        : { data: [], error: null };
      if (rosterError) throw new Error('No se pudo cargar tu plantilla.');
      return { team, owned: (owned ?? []) as any[] };
    })(),
    db.rpc('market_bid_counts', { target_week: week }),
    db.rpc('my_market_bids', { target_week: week }),
  ]);
  if (counts.error || mine.error) throw new Error('No se pudieron cargar las pujas.');
  const byPlayer = new Map(
    (counts.data ?? []).map((row: any) => [row.player_id, Number(row.bidder_count)]),
  );
  const mineSet = new Set((mine.data ?? []).map((row: any) => row.player_id));
  return {
    ...squad,
    offers: offers.map((offer) => ({
      ...offer,
      bidderCount: byPlayer.get(offer.player_id) ?? 0,
      hasBid: mineSet.has(offer.player_id),
    })),
  };
}
