import { countryCode as resolveCountryCode } from '@/lib/country-code';
/* Dynamic Supabase relations are checked by PostgreSQL; the inherited client schema only covers core tables. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { Clock3, ArrowUpRight } from 'lucide-react';
import './market.css';
import { currentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Countdown, Submit } from '@/components/participant-forms';
import { euros } from '@/components/participant-data';
import { madridWeek } from '@/components/participant-time';
import { placeBid } from './actions';
export const metadata = { title: 'Mercado' };
export default async function Market({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const week = madridWeek();
  const profile = await currentProfile();
  let offers: any[] = [],
    team: any = null,
    owned: any[] = [];
  if (profile) {
    const db: any = await createClient();
    const [{ data: rows, error }, { data: squad }] = await Promise.all([
      db
        .from('market_offers')
        .select(
          'id,slot,mmr,player_id,players(name,slug,market_value,initial_value,mkcentral_player_id,nationality,teams(name))',
        )
        .eq('week_start', week.week)
        .order('slot'),
      db.from('fantasy_teams').select('id,budget').eq('user_id', profile.id).maybeSingle(),
    ]);
    if (error) throw new Error('No se pudieron cargar las ofertas.');
    offers = rows ?? [];
    const { data: details } = await db
      .from('player_enriched_details')
      .select('mkcentral_player_id,display_name,country,tier')
      .eq('season_number', 3)
      .in(
        'mkcentral_player_id',
        offers.map((offer) => String(offer.players?.mkcentral_player_id)),
      );
    const detailById = new Map((details ?? []).map((d: any) => [String(d.mkcentral_player_id), d]));
    offers = offers.map((offer) => ({
      ...offer,
      detail: detailById.get(String(offer.players?.mkcentral_player_id)),
    }));
    team = squad;
    if (team) {
      const result = await db
        .from('fantasy_roster_players')
        .select('player_id')
        .eq('fantasy_team_id', team.id);
      owned = result.data ?? [];
    }
    const [{ data: counts }, { data: mine }] = await Promise.all([
      db.rpc('market_bid_counts', { target_week: week.week }),
      db.rpc('my_market_bids', { target_week: week.week }),
    ]);
    const countByPlayer = new Map(
      (counts ?? []).map((row: any) => [row.player_id, Number(row.bidder_count)]),
    );
    const mineSet = new Set((mine ?? []).map((row: any) => row.player_id));
    offers = offers.map((offer) => ({
      ...offer,
      bidderCount: countByPlayer.get(offer.player_id) ?? 0,
      hasBid: mineSet.has(offer.player_id),
    }));
  }
  return (
    <>
      <header className="market-header">
        <div className="market-intro">
          <div className="market-title-row">
            <h1>Mercado de fichajes</h1>
            <span className={`market-state ${week.marketOpen ? 'is-open' : 'is-closed'}`}>
              <span aria-hidden="true" />
              {week.marketOpen ? 'Abierto' : 'Cerrado'}
            </span>
          </div>
          <p>Diez oportunidades cada semana para construir tu próxima victoria.</p>
          <div className="market-budget">
            <div>
              <span>Presupuesto disponible</span>
              <strong>{team ? euros(team.budget) : 'Accede para consultar'}</strong>
            </div>
            <Link href={profile ? '/my-team' : '/login'} className="market-team-link">
              {profile ? 'Ver mi equipo' : 'Acceder'}
              <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="market-deadline">
          <div className="market-deadline-title">
            <Clock3 size={18} aria-hidden="true" />
            <span>{week.marketOpen ? 'El mercado cierra en' : 'Mercado cerrado'}</span>
          </div>
          {week.marketOpen && <Countdown at={week.marketClose} />}
          <div className="market-schedule">
            <strong>{week.marketOpen ? 'Viernes · 23:59' : 'Apertura: lunes · 01:00'}</strong>
            <span>Hora de Madrid</span>
          </div>
        </div>
      </header>
      {params.error && (
        <p role="alert" className="participant-feedback">
          {params.error}
        </p>
      )}
      {!week.marketOpen && (
        <p className="panel">
          El mercado está cerrado. Los fichajes vuelven el lunes a la 01:00, hora de Madrid.
        </p>
      )}
      <section className="market-offers">
        <h2>Ofertas de la semana</h2>
        {!profile ? (
          <div className="empty-state">
            <h3>Tu siguiente fichaje te espera</h3>
            <p>
              Las ofertas semanales están disponibles para los participantes. Como espectador,
              puedes explorar todos los pilotos.
            </p>
            <div className="toolbar">
              <Link className="button primary" href="/login">
                Acceder
              </Link>
              <Link className="button secondary" href="/players">
                Explorar pilotos
              </Link>
            </div>
          </div>
        ) : (
          <>
            {offers.length ? (
              <div className="participant-offers">
                {offers.map((o) => {
                  const p = o.players;
                  const inTeam = owned.some((r) => r.player_id === o.player_id);
                  const initials = p.name
                    .split(' ')
                    .map((part: string) => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  const playerCountry = o.detail?.country ?? p.nationality;
                  const flag = playerCountry ? resolveCountryCode(playerCountry) : null;
                  return (
                    <article key={o.id} className="participant-offer">
                      <div className="participant-offer-head">
                        <div className="player-avatar" aria-hidden="true">
                          {initials}
                        </div>
                        <div className="player-identity">
                          <h2>
                            <Link href={`/players/${p.slug}`}>{p.name}</Link>
                          </h2>
                          <p className="muted">
                            {p.teams?.name ?? 'Piloto independiente'}{' '}
                            {playerCountry && (
                              <span className="market-country">
                                {flag && (
                                  <span
                                    className="country-flag"
                                    role="img"
                                    aria-label={`Bandera de ${playerCountry}`}
                                    style={{
                                      backgroundImage: `url(https://flagcdn.com/w40/${flag}.png)`,
                                    }}
                                  />
                                )}{' '}
                                {playerCountry}
                              </span>
                            )}
                          </p>
                          <div className="market-player-meta">
                            <span className="badge">
                              {o.slot === 10
                                ? 'Code Genius'
                                : o.mmr > 9000
                                  ? 'Top MMR'
                                  : o.mmr < 4000
                                    ? 'Oportunidad'
                                    : 'Rango medio'}
                            </span>
                            <span className="muted">MMR {o.mmr.toLocaleString('es-ES')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="player-price-row">
                        <div>
                          <span className="muted">Valor base</span>
                          <strong>{euros(p.initial_value)}</strong>
                        </div>
                        <div className="bidder-count">
                          <span className="participant-dot" aria-hidden="true" />
                          <span>
                            {o.bidderCount}{' '}
                            {o.bidderCount === 1 ? 'participante puja' : 'participantes pujan'}
                          </span>
                        </div>
                      </div>
                      <form action={placeBid} className="bid-form">
                        <input type="hidden" name="team" value={team?.id ?? ''} />
                        <input type="hidden" name="player" value={o.player_id} />
                        <label className="field">
                          <span>
                            Tu puja (€) <small>Privada</small>
                          </span>
                          <input
                            name="amount"
                            type="number"
                            min={p.initial_value}
                            step="1"
                            placeholder={String(p.initial_value)}
                            required
                          />
                        </label>
                        <Submit
                          disabled={
                            !team ||
                            !week.marketOpen ||
                            inTeam ||
                            owned.length >= 10 ||
                            team.budget < p.initial_value
                          }
                        >
                          {inTeam
                            ? 'En tu plantilla'
                            : o.hasBid
                              ? 'Actualizar puja'
                              : 'Pujar por piloto'}
                        </Submit>
                      </form>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <h3>Aún no hay ofertas publicadas</h3>
                <p>El mercado semanal se publica los lunes a la 01:00.</p>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
