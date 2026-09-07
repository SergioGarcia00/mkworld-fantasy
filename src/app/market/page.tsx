/* Dynamic Supabase relations are checked by PostgreSQL; the inherited client schema only covers core tables. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
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
  searchParams: Promise<{ error?: string; mmr?: string; price?: string; team?: string }>;
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
        .select('id,slot,mmr,player_id,players(name,slug,market_value,initial_value,mkcentral_player_id,nationality,teams(name))')
        .eq('week_start', week.week)
        .order('slot'),
      db.from('fantasy_teams').select('id,budget').eq('user_id', profile.id).maybeSingle(),
    ]);
    if (error) throw new Error('No se pudieron cargar las ofertas.');
    offers = rows ?? [];
    const { data: details } = await db.from('player_enriched_details').select('mkcentral_player_id,display_name,country,tier').eq('season_number', 3);
    const detailById = new Map((details ?? []).map((d: any) => [String(d.mkcentral_player_id), d]));
    const detailByName = new Map((details ?? []).map((d: any) => [String(d.display_name).trim().toLocaleLowerCase(), d]));
    offers = offers.map((offer) => ({ ...offer, detail: detailById.get(String(offer.players?.mkcentral_player_id)) ?? detailByName.get(String(offer.players?.name).trim().toLocaleLowerCase()) }));
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
    const countByPlayer = new Map((counts ?? []).map((row: any) => [row.player_id, Number(row.bidder_count)]));
    const mineSet = new Set((mine ?? []).map((row: any) => row.player_id));
    offers = offers.map((offer) => ({ ...offer, bidderCount: countByPlayer.get(offer.player_id) ?? 0, hasBid: mineSet.has(offer.player_id) }));
  }
  const teams: string[] = [
    ...new Set<string>(offers.map((o) => o.players?.teams?.name).filter(Boolean)),
  ];
  const filtered = offers.filter(
    (o) =>
      (!params.team || o.players?.teams?.name === params.team) &&
      (!params.price || o.players?.market_value <= Number(params.price)) &&
      (!params.mmr ||
        (params.mmr === 'high'
          ? o.mmr > 9000
          : params.mmr === 'mid'
            ? o.mmr >= 4000 && o.mmr <= 5000
            : o.mmr < 4000)),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Mercado de fichajes</h1>
          <p className="muted">
            Diez oportunidades cada semana para construir tu próxima victoria.
          </p>
        </div>
        <Countdown at={week.marketClose} />
      </div>
      <div className="participant-summary">
        <div>
          <span className="muted">Estado del mercado</span>
          <strong>{week.marketOpen ? 'Abierto' : 'Cerrado'}</strong>
        </div>
        <div>
          <span className="muted">Presupuesto disponible</span>
          <strong>{team ? euros(team.budget) : 'Accede para consultar'}</strong>
        </div>
        <div>
          <span className="muted">Próximo cierre</span>
          <strong>Viernes · 23:59</strong>
          <span className="muted">Hora de Madrid</span>
        </div>
      </div>
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
      <section className="panel">
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
            <form className="participant-filters">
              <label className="field">
                MMR
                <select name="mmr" defaultValue={params.mmr ?? ''}>
                  <option value="">Todos los rangos</option>
                  <option value="high">Más de 9.000</option>
                  <option value="mid">4.000–5.000</option>
                  <option value="low">Menos de 4.000</option>
                </select>
              </label>
              <label className="field">
                Precio máximo
                <input
                  name="price"
                  type="number"
                  min="0"
                  placeholder="Sin límite"
                  defaultValue={params.price}
                />
              </label>
              <label className="field">
                Equipo
                <select name="team" defaultValue={params.team ?? ''}>
                  <option value="">Todos los equipos</option>
                  {teams.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <button className="button secondary">Filtrar</button>
              <Link href="/market">Limpiar</Link>
            </form>
            {filtered.length ? (
              <div className="participant-offers">
                {filtered.map((o) => {
                  const p = o.players;
                  const inTeam = owned.some((r) => r.player_id === o.player_id);
                  const initials = p.name
                    .split(' ')
                    .map((part: string) => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  const countryCodes: Record<string, string> = { Spain: 'es', 'United States': 'us', Canada: 'ca', Lebanon: 'lb', France: 'fr', Germany: 'de', Italy: 'it', Portugal: 'pt', 'United Kingdom': 'gb', Japan: 'jp', Brazil: 'br', Mexico: 'mx', Chile: 'cl', Argentina: 'ar', Australia: 'au', Netherlands: 'nl', Belgium: 'be', Sweden: 'se', Norway: 'no', Finland: 'fi', Denmark: 'dk', Poland: 'pl', Austria: 'at', Switzerland: 'ch', Turkey: 'tr' };
                  const playerCountry = o.detail?.country ?? p.nationality;
                  const flag = playerCountry ? countryCodes[playerCountry] : null;
                  return (
                    <article key={o.id} className="participant-offer">
                      <div className="participant-offer-head">
                        <div className="player-avatar" aria-hidden="true">{initials}</div>
                        <div className="player-identity">
                          <div className="toolbar">
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
                          <h2><Link href={`/players/${p.slug}`}>{p.name}</Link></h2>
                          <p className="muted">{p.teams?.name ?? 'Piloto independiente'} {playerCountry && <span className="market-country">{flag && <span className="country-flag" role="img" aria-label={`Bandera de ${playerCountry}`} style={{ backgroundImage: `url(https://flagcdn.com/w40/${flag}.png)` }} />} {playerCountry}</span>}</p>
                        </div>
                      </div>
                      <div className="player-price-row">
                        <div>
                          <span className="muted">Valor base</span>
                          <strong>{euros(p.initial_value)}</strong>
                        </div>
                        <div className="bidder-count">
                          <span className="participant-dot" aria-hidden="true" />
                          <span>{o.bidderCount} {o.bidderCount === 1 ? 'participante puja' : 'participantes pujan'}</span>
                        </div>
                      </div>
                      <form action={placeBid} className="bid-form">
                        <input type="hidden" name="team" value={team?.id ?? ''} />
                        <input type="hidden" name="player" value={o.player_id} />
                        <label className="field">
                          <span>Tu puja <small>Importe privado</small></span>
                          <input name="amount" type="number" min={p.initial_value} step="1" placeholder={String(p.initial_value)} required />
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
                          {inTeam ? 'En tu plantilla' : o.hasBid ? 'Actualizar puja' : 'Pujar por piloto'}
                        </Submit>
                      </form>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <h3>
                  {offers.length
                    ? 'Sin ofertas para estos filtros'
                    : 'Aún no hay ofertas publicadas'}
                </h3>
                <p>
                  {offers.length
                    ? 'Prueba otro rango o limpia los filtros.'
                    : 'El mercado semanal se publica los lunes a la 01:00.'}
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
