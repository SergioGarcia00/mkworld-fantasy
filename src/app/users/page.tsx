import Link from 'next/link';
import { ArrowUpRight, UserRound } from 'lucide-react';
import { currentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeading, EmptyState } from '@/components/ui';
import { euros } from '@/components/participant-data';
import { AcquirePlayerModal } from '@/components/acquire-player-modal';
import { practiceSettings } from '@/lib/practice';

/* Public roster directory. Actions remain available only to authenticated users. */
export const metadata = { title: 'Usuarios' };

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const profile = await currentProfile();
  const db: any = await createClient();
  const practice = await practiceSettings();
  const params = await searchParams;
  const { data: directory, error } = await db.rpc('spectator_users');

  if (error) throw new Error('No se pudieron cargar los usuarios.');
  const grouped = new Map<string, any>();
  for (const row of directory ?? []) {
    const participant = grouped.get(row.fantasy_team_id) ?? {
      id: row.fantasy_team_id,
      name: row.fantasy_team_name,
      profiles: { display_name: row.participant_name },
      fantasy_roster_players: [],
    };
    if (row.player_id)
      participant.fantasy_roster_players.push({
        player_id: row.player_id,
        purchase_price: row.purchase_price,
        clause_protection_amount: row.clause_protection_amount,
        clause_protected_until: row.clause_protected_until,
        players: {
          name: row.player_name,
          slug: row.player_slug,
          mmr: row.player_mmr,
          market_value: row.player_market_value,
          teams: { name: row.real_team_name },
        },
      });
    grouped.set(row.fantasy_team_id, participant);
  }
  const participants = [...grouped.values()];

  return (
    <>
      <PageHeading
        title="Usuarios"
        description="Consulta las plantillas de los participantes y descubre qué jugadores están disponibles para futuros traspasos."
      />
      {(params.error || params.success) && <p role="status">{params.error || params.success}</p>}
      {participants.length ? (
        <div className="team-list users-list">
          {participants.map((team) => {
            const roster = team.fantasy_roster_players ?? [];
            const totalValue = roster.reduce(
              (sum: number, row: any) => sum + Number(row.players?.market_value ?? 0),
              0,
            );
            return (
              <section className="panel user-card" key={team.id}>
                <div className="user-card-heading">
                  <span className="team-monogram" aria-hidden="true">
                    {(team.profiles?.display_name ?? team.name).slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <h2>{team.profiles?.display_name ?? 'Participante'}</h2>
                    <p>{team.name} · {roster.length} jugadores · Valor {euros(totalValue)}</p>
                  </div>
                </div>
                {roster.length ? (
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead><tr><th>Jugador</th><th>Equipo</th><th>MMR</th><th>Valor</th>{profile && <th>Acción</th>}</tr></thead>
                      <tbody>
                        {roster.map((row: any) => (
                          <tr key={row.player_id}>
                            <td><Link href={`/players/${row.players?.slug}`}>{row.players?.name}</Link></td>
                            <td>{row.players?.teams?.name ?? '—'}</td>
                            <td>{row.players?.mmr?.toLocaleString('es-ES') ?? '—'}</td>
                            <td>{euros(Number(row.players?.market_value ?? 0))}</td>
                            {profile && <td>
                              {(() => {
                                const protectedByDate = row.clause_protected_until && new Date(row.clause_protected_until) > new Date();
                                const protectedPlayer = protectedByDate;
                                const reason = protectedByDate
                                  ? `Protegido hasta ${new Date(row.clause_protected_until).toLocaleString('es-ES')}.`
                                  : undefined;
                                return (
                                  <AcquirePlayerModal
                                    player={row.player_id}
                                    name={row.players?.name ?? 'jugador'}
                                    owner={team.profiles?.display_name ?? team.name}
                                    clause={euros(Math.min(
                                      Math.round(Number(row.players?.market_value ?? 0) * 3),
                                      Math.round(Number(row.players?.market_value ?? 0) * 1.5) + Number(row.clause_protection_amount ?? 0),
                                    ))}
                                    disabled={team.user_id === profile.id || protectedPlayer}
                                    reason={team.user_id === profile.id ? 'Ya está en tu plantilla.' : reason}
                                  />
                                );
                              })()}
                            </td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="muted">Todavía no tiene jugadores en su plantilla.</p>}
              </section>
            );
          })}
        </div>
      ) : (
        <EmptyState title="Aún no hay usuarios" description="Cuando se unan participantes, sus plantillas aparecerán aquí." href="/" label="Volver al inicio" />
      )}
    </>
  );
}
