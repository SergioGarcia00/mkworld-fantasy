/* Dynamic Supabase relations are checked by PostgreSQL; the inherited client schema only covers core tables. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { currentProfile, requireAdmin } from '@/lib/auth';
import { getCatalog } from '@/lib/catalog';
import { createClient } from '@/lib/supabase/server';
import { savePlayer, saveTeam, deleteTeam } from './actions';
import {
  createParticipant,
  setAccess,
  initializeOfficialLeague,
  enrollParticipant,
  setPublication,
  setMatchdayStatus,
  renameParticipantTeam,
  removeParticipant,
  createNews,
  deleteChatMessage,
  notifyParticipants,
} from './account-actions';
import { adminOperation } from './operations';
import { AdminForm, AdminDirectForm, ImportWorkbench } from './forms';
import './admin.css';
import { PracticePanel } from './practice-panel';
export const metadata = { title: 'Administración' };
const tabs = [
  ['practice', 'Liga de pruebas'],
  ['accounts', 'Cuentas y permisos'],
  ['players', 'Jugadores'],
  ['teams', 'Equipos reales'],
  ['market', 'Mercado semanal'],
  ['matchdays', 'Jornadas y cálculo'],
  ['results', 'Resultados enviados'],
  ['history', 'Puntuaciones'],
  ['lineups', 'Alineaciones'],
  ['news', 'Noticias y avisos'],
  ['chat', 'Moderación del chat'],
  ['audit', 'Auditoría'],
  ['config', 'Configuración'],
  ['import', 'Importar catálogo'],
];
function Field({
  label,
  name,
  value = '',
  type = 'text',
  required = true,
}: {
  label: string;
  name: string;
  value?: string | number;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      {label}
      <input name={name} type={type} defaultValue={value} required={required} />
    </label>
  );
}
function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return rows.length ? (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((v, j) => (
                <td key={j}>{v ?? '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p className="empty-state">Todavía no hay registros en esta sección.</p>
  );
}
export default async function Admin({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const profile = await currentProfile();
  if (profile?.role !== 'ADMIN')
    return (
      <section className="panel empty-state">
        <h1>Acceso de administración</h1>
        <p>Inicia sesión con una cuenta administradora para gestionar la competición.</p>
        <Link className="button primary" href="/login">
          Iniciar sesión
        </Link>
      </section>
    );
  await requireAdmin();
  const data = await getCatalog();
  const requested = (await searchParams).tab;
  const tab = tabs.some((t) => t[0] === requested) ? requested : 'accounts';
  const db: any = await createClient();
  async function query(table: string, selection: string, order: string) {
    const result = await db
      .from(table)
      .select(selection)
      .order(order, {
        ascending: !['created_at', 'submitted_at', 'timestamp', 'week_start', 'points'].includes(
          order,
        ),
      })
      .limit(500);
    if (result.error)
      throw new Error(
        'No se pudieron cargar los registros de administración. Comprueba la conexión y las migraciones.',
      );
    return result.data as any[];
  }
  let content: ReactNode;
  const seasonSelect = (
    <label className="field">
      Temporada
      <select name="season" required>
        {data.seasons.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  );
  if (tab === 'practice') content = <PracticePanel />;
  else if (tab === 'import') content = <ImportWorkbench seasons={data.seasons} />;
  else if (tab === 'players')
    content = (
      <section className="panel">
        <h2>Catálogo de jugadores</h2>
        <p className="muted">
          Edita su equipo, valor y disponibilidad. El historial de competición se conserva.
        </p>
        {data.players.map((p) => (
          <details className="admin-row" key={p.id}>
            <summary>
              {p.name} · {data.teams.find((t) => t.id === p.team_id)?.name}
            </summary>
            <AdminForm action={savePlayer}>
              <input type="hidden" name="id" value={p.id} />
              <div className="grid-2">
                <Field label="Nombre" name="name" value={p.name} />
                <label className="field">
                  Equipo
                  <select name="team_id" defaultValue={p.team_id}>
                    {data.teams.map((t) => (
                      <option value={t.id} key={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  label="Valor de mercado (€)"
                  name="market_value"
                  type="number"
                  value={p.market_value}
                />
                <label className="field">
                  Disponibilidad
                  <select name="status" defaultValue={p.status}>
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo</option>
                    <option value="SUSPENDED">Suspendido</option>
                  </select>
                </label>
              </div>
            </AdminForm>
          </details>
        ))}
        {!data.players.length && (
          <p className="empty-state">Importa el catálogo para incorporar jugadores.</p>
        )}
      </section>
    );
  else if (tab === 'teams')
    content = (
      <section className="panel">
        <h2>Equipos reales</h2>
        {[null, ...data.teams].map((t) => (
          <details className="admin-row" key={t?.id ?? 'new'}>
            <summary>{t?.name ?? 'Crear un equipo'}</summary>
            <AdminForm action={saveTeam}>
              <input type="hidden" name="id" value={t?.id ?? ''} />
              <div className="grid-3">
                <Field label="Nombre" name="name" value={t?.name} />
                <Field label="Abreviatura" name="tag" value={t?.tag} required={false} />
                <Field label="Color" name="color" type="color" value={t?.color ?? '#3d9cff'} />
              </div>
            </AdminForm>
            {t && (
              <div className="admin-subsection">
                <AdminForm action={deleteTeam} label="Eliminar equipo vacío">
                  <input type="hidden" name="id" value={t.id} />
                  <label className="admin-check">
                    <input type="checkbox" name="confirm" required />
                    Confirmo eliminar este equipo si no tiene jugadores ni historial.
                  </label>
                </AdminForm>
              </div>
            )}
          </details>
        ))}
      </section>
    );
  else if (tab === 'accounts') {
    const profiles = await query('profiles', 'id,display_name,role,access_enabled', 'display_name');
    const leagueResult = await db.rpc('official_league', {});
    if (leagueResult.error) throw new Error('No se pudo cargar la liga oficial.');
    const league = leagueResult.data?.[0];
    content = (
      <>
        <section className="panel">
          <h2>Cuentas y permisos</h2>
          <p className="muted">
            Las cuentas se crean desde dirección de carrera. Los roles y accesos se verifican en el
            servidor.
          </p>
          {profiles.map((p) => (
            <details className="admin-row" key={p.id}>
              <summary>
                {p.display_name} · {p.role === 'ADMIN' ? 'Administrador' : 'Participante'} ·{' '}
                {p.access_enabled ? 'Habilitado' : 'Sin acceso'}
              </summary>
              <div className="grid-2">
                <AdminForm
                  action={setAccess}
                  label={p.access_enabled ? 'Deshabilitar acceso' : 'Habilitar acceso'}
                >
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="enabled" value={String(!p.access_enabled)} />
                  <p>
                    El cambio de acceso conserva el equipo y su historial. Solo se aplica a
                    participantes.
                  </p>
                </AdminForm>
                {p.id !== profile.id && (
                  <AdminForm action={adminOperation} label="Actualizar rol">
                    <input type="hidden" name="operation" value="role" />
                    <input type="hidden" name="id" value={p.id} />
                    <label className="field">
                      Rol
                      <select name="role" defaultValue={p.role}>
                        <option value="USER">Participante</option>
                        <option value="ADMIN">Administrador</option>
                      </select>
                    </label>
                    <label className="admin-check">
                      <input type="checkbox" name="confirm" required />
                      Confirmo el cambio de permisos.
                    </label>
                  </AdminForm>
                )}
                {p.role === 'USER' && (
                  <>
                    <AdminForm action={renameParticipantTeam} label="Cambiar nombre del equipo">
                      <input type="hidden" name="user" value={p.id} />
                      <Field label="Nuevo nombre" name="name" />
                    </AdminForm>
                    <AdminForm action={removeParticipant} label="Quitar de la liga">
                      <input type="hidden" name="user" value={p.id} />
                      <p>Retira su equipo de la liga y conserva su cuenta.</p>
                    </AdminForm>
                  </>
                )}
              </div>
            </details>
          ))}
        </section>
        <section className="panel admin-subsection">
          <h2>Crear participante</h2>
          <AdminForm action={createParticipant} label="Crear cuenta">
            <div className="grid-3">
              <Field label="Nombre visible" name="displayName" />
              <Field label="Usuario (letras, números o _)" name="username" />
              <Field label="Contraseña (mínimo 8 caracteres)" name="password" type="password" />
            </div>
          </AdminForm>
        </section>
        <section className="panel admin-subsection">
          <h2>{league?.name ?? 'Preparar liga oficial'}</h2>
          {league ? (
            <>
              <AdminForm
                action={setPublication}
                label={league.is_public ? 'Retirar de la zona pública' : 'Publicar liga'}
              >
                <input type="hidden" name="id" value={league.id} />
                <input type="hidden" name="published" value={String(!league.is_public)} />
                <p>
                  {league.is_public
                    ? 'La liga está visible para espectadores.'
                    : 'La liga está oculta para espectadores.'}
                </p>
              </AdminForm>
              <div className="admin-subsection">
                <h3>Inscribir un participante</h3>
                <AdminForm action={enrollParticipant} label="Inscribir en la liga">
                  <label className="field">
                    Participante
                    <select name="user" required>
                      {profiles
                        .filter((p) => p.role === 'USER' && p.access_enabled)
                        .map((p) => (
                          <option value={p.id} key={p.id}>
                            {p.display_name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <Field label="Nombre del equipo fantasy" name="name" />
                </AdminForm>
              </div>
            </>
          ) : (
            <AdminForm action={initializeOfficialLeague} label="Configurar liga">
              <Field label="Nombre de liga" name="name" />
              {seasonSelect}
            </AdminForm>
          )}
        </section>
      </>
    );
  } else if (tab === 'matchdays') {
    const days = await query('matchdays', 'id,number,name,status', 'number');
    content = (
      <section className="panel">
        <h2>Jornadas y puntuación oficial</h2>
        <p className="muted">
          El cálculo utiliza las puntuaciones oficiales de jugadores y las alineaciones guardadas.
          Los resultados enviados por participantes se consultan por separado.
        </p>
        {days.map((d) => (
          <div className="admin-row" key={d.id}>
            <div className="admin-row-head">
              <h3>
                J{d.number} · {d.name}
              </h3>
              <span className="badge">{d.status}</span>
            </div>
            <div className="toolbar">
              {[
                ['OPEN', 'Abrir'],
                ['LOCKED', 'Bloquear'],
                ['FINISHED', 'Finalizar'],
              ].map(([status, label]) => (
                <AdminDirectForm action={setMatchdayStatus} key={status}>
                  <input type="hidden" name="id" value={d.id} />
                  <input type="hidden" name="status" value={status} />
                  <button className="button secondary" disabled={d.status === status}>
                    {label}
                  </button>
                </AdminDirectForm>
              ))}
              <Link className="button secondary" href="/admin?tab=practice">
                Configurar pruebas sin horarios
              </Link>
              <AdminForm action={adminOperation} label="Recalcular puntuación">
                <input type="hidden" name="operation" value="scores" />
                <input type="hidden" name="id" value={d.id} />
              </AdminForm>
            </div>
          </div>
        ))}
        {!days.length && <p className="empty-state">No hay jornadas configuradas.</p>}
      </section>
    );
  } else if (tab === 'market') {
    const rows = await query(
      'market_offers',
      'id,slot,mmr,week_start,players(name,market_value,teams(name))',
      'week_start',
    );
    content = (
      <section className="panel">
        <h2>Mercado semanal</h2>
        <Table
          headers={['Semana', 'Oferta', 'Jugador', 'Equipo', 'MMR', 'Valor (€)']}
          rows={rows.map((r) => [
            r.week_start,
            r.slot,
            r.players?.name,
            r.players?.teams?.name,
            r.mmr,
            r.players?.market_value?.toLocaleString('es-ES'),
          ])}
        />
        <div className="admin-subsection">
          <h3>Regenerar ofertas</h3>
          <AdminForm action={adminOperation} label="Generar mercado">
            <input type="hidden" name="operation" value="market" />
            {seasonSelect}
            <Field label="Lunes de la semana" name="week" type="date" />
            <label className="admin-check">
              <input type="checkbox" name="confirm" required />
              Reemplazar las ofertas de esta temporada y semana.
            </label>
          </AdminForm>
        </div>
      </section>
    );
  } else if (tab === 'results') {
    const rows = await query(
      'player_weekly_inputs',
      'game_one,game_two,players(name),fantasy_teams(name)',
      'submitted_at',
    );
    content = (
      <section className="panel">
        <h2>Resultados enviados</h2>
        <p className="muted">
          Revisa las partidas introducidas por los participantes antes de contrastarlas con el
          resultado oficial.
        </p>
        <Table
          headers={['Equipo fantasy', 'Jugador', 'Partida 1', 'Partida 2', 'Total']}
          rows={rows.map((r) => [
            r.fantasy_teams?.name,
            r.players?.name,
            r.game_one,
            r.game_two,
            Number(r.game_one) + Number(r.game_two ?? 0),
          ])}
        />
      </section>
    );
  } else if (tab === 'history') {
    const rows = await query(
      'fantasy_team_matchday_scores',
      'points,matchdays(number,name),fantasy_teams(name)',
      'points',
    );
    content = (
      <section className="panel">
        <h2>Puntuaciones por jornada</h2>
        <Table
          headers={['Equipo fantasy', 'Jornada', 'Puntos']}
          rows={rows.map((r) => [
            r.fantasy_teams?.name,
            `${r.matchdays?.number} · ${r.matchdays?.name}`,
            r.points,
          ])}
        />
      </section>
    );
  } else if (tab === 'lineups') {
    const rows = await query(
      'fantasy_lineups',
      'matchdays(number,name),fantasy_teams(name),fantasy_lineup_players(player_name,is_captain,is_starter)',
      'matchday_id',
    );
    content = (
      <section className="panel">
        <h2>Alineaciones registradas</h2>
        <Table
          headers={['Equipo fantasy', 'Jornada', 'Jugadores']}
          rows={rows.map((r) => [
            r.fantasy_teams?.name,
            r.matchdays?.name,
            (r.fantasy_lineup_players ?? [])
              .map(
                (p: any) =>
                  `${p.player_name}${p.is_captain ? ' (capitán)' : ''}${p.is_starter ? '' : ' (reserva)'}`,
              )
              .join(', '),
          ])}
        />
      </section>
    );
  } else if (tab === 'news')
    content = (
      <div className="grid-2">
        <section className="panel">
          <h2>Crear noticia</h2>
          <AdminDirectForm action={createNews}>
            <Field label="Título" name="title" />
            <label className="field">
              Categoría
              <select name="category">
                <option>Competición</option>
                <option>Mercado</option>
                <option>Resultados</option>
                <option>Aviso</option>
              </select>
            </label>
            <label className="field">
              Texto
              <textarea name="body" required maxLength={10000} rows={8} />
            </label>
            <label className="admin-check">
              <input type="checkbox" name="published" />
              Publicar al guardar
            </label>
            <button className="button primary">Guardar noticia</button>
          </AdminDirectForm>
        </section>
        <section className="panel">
          <h2>Avisar a participantes</h2>
          <AdminDirectForm action={notifyParticipants}>
            <Field label="Título" name="title" />
            <label className="field">
              Tipo
              <select name="kind">
                <option value="INFO">Información</option>
                <option value="MARKET">Mercado</option>
                <option value="LINEUP">Alineaciones</option>
                <option value="RESULT">Resultados</option>
              </select>
            </label>
            <label className="field">
              Mensaje
              <textarea name="body" required maxLength={500} rows={6} />
            </label>
            <button className="button primary">Enviar aviso</button>
          </AdminDirectForm>
        </section>
      </div>
    );
  else if (tab === 'chat') {
    const rows = await query(
      'chat_messages',
      'id,body,deleted_at,created_at,profiles(display_name)',
      'created_at',
    );
    content = (
      <section className="panel">
        <h2>Moderación del chat</h2>
        {rows
          .filter((r) => !r.deleted_at)
          .map((r) => (
            <div className="admin-row" key={r.id}>
              <div className="admin-row-head">
                <strong>{r.profiles?.display_name}</strong>
                <time>{new Date(r.created_at).toLocaleString('es-ES')}</time>
              </div>
              <p>{r.body}</p>
              <AdminDirectForm action={deleteChatMessage}>
                <input type="hidden" name="id" value={r.id} />
                <button className="button secondary">Ocultar mensaje</button>
              </AdminDirectForm>
            </div>
          ))}
        {!rows.some((r) => !r.deleted_at) && (
          <p className="empty-state">No hay mensajes para moderar.</p>
        )}
      </section>
    );
  } else if (tab === 'audit') {
    const [transactions, prices] = await Promise.all([
      query(
        'fantasy_transactions',
        'created_at,type,amount,players(name),fantasy_teams(name)',
        'created_at',
      ),
      query(
        'player_market_value_history',
        'timestamp,value,variation,reason,players(name)',
        'timestamp',
      ),
    ]);
    content = (
      <>
        <section className="panel">
          <h2>Auditoría de movimientos</h2>
          <p className="muted">
            Historial de transacciones y cambios de valor registrados por la base de datos.
          </p>
          <Table
            headers={['Fecha', 'Equipo', 'Jugador', 'Operación', 'Importe (€)']}
            rows={transactions.map((r) => [
              new Date(r.created_at).toLocaleString('es-ES'),
              r.fantasy_teams?.name,
              r.players?.name,
              r.type,
              r.amount?.toLocaleString('es-ES'),
            ])}
          />
        </section>
        <section className="panel admin-subsection">
          <h2>Cambios de valor</h2>
          <Table
            headers={['Fecha', 'Jugador', 'Valor (€)', 'Variación (€)', 'Motivo']}
            rows={prices.map((r) => [
              new Date(r.timestamp).toLocaleString('es-ES'),
              r.players?.name,
              r.value,
              r.variation,
              r.reason,
            ])}
          />
        </section>
      </>
    );
  } else
    content = (
      <section className="panel">
        <h2>Reglas de la competición</h2>
        <p className="muted">
          Estos valores afectan las nuevas operaciones. Las alineaciones históricas conservan sus
          reglas guardadas.
        </p>
        <AdminForm action={adminOperation}>
          <input type="hidden" name="operation" value="config" />
          <div className="grid-2">
            {(
              [
                ['starting_budget', 'Presupuesto inicial (€)'],
                ['initial_player_value', 'Valor inicial del jugador (€)'],
                ['squad_size', 'Jugadores por plantilla'],
                ['starter_size', 'Titulares'],
                ['max_players_same_real_team', 'Máximo del mismo equipo real'],
                ['captain_multiplier', 'Multiplicador del capitán'],
              ] as const
            ).map(([name, label]) => (
              <label className="field" key={name}>
                {label}
                <input
                  name={name}
                  type="number"
                  required
                  min={name.includes('value') || name === 'starting_budget' ? 0 : 1}
                  step={name === 'captain_multiplier' ? 0.1 : 1}
                  defaultValue={data.config[name]}
                />
              </label>
            ))}
          </div>
        </AdminForm>
      </section>
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Dirección de carrera</h1>
          <p className="muted">Control de participantes, catálogo y competición.</p>
        </div>
        <Link href="/" className="button secondary">
          Ver plataforma pública
        </Link>
      </div>
      <div className="admin-layout">
        <nav className="admin-nav" aria-label="Secciones de administración">
          {tabs.map(([id, label]) => (
            <Link key={id} href={`/admin?tab=${id}`} aria-current={tab === id ? 'page' : undefined}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="admin-content">{content}</div>
      </div>
    </>
  );
}
