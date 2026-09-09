'use client';
import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Crown } from 'lucide-react';
import { signIn } from '@/app/auth/actions';
import { saveLineup } from '@/app/lineup/actions';
import { saveScore } from '@/app/scores/actions';
import './participant.css';
export function Submit({
  children,
  disabled = false,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button className="button primary" disabled={disabled || pending}>
      {pending ? 'Guardando…' : children}
    </button>
  );
}
export function Countdown({ at }: { at: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds =
    now === null ? null : Math.max(0, Math.floor((new Date(at).getTime() - now) / 1000));
  return (
    <span className="badge">
      {seconds === null
        ? 'Calculando plazo…'
        : seconds === 0
          ? 'Plazo cerrado'
          : `${Math.floor(seconds / 86400)}d ${Math.floor(seconds / 3600) % 24}h ${Math.floor(seconds / 60) % 60}m ${seconds % 60}s`}
    </span>
  );
}
export function LoginForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(signIn, {});
  return (
    <form action={action} className="participant-form">
      <label className="field">
        Usuario
        <input
          name="identifier"
          autoComplete="username"
          required
          placeholder="Tu usuario asignado"
          disabled={!configured}
        />
      </label>
      <label className="field">
        Contraseña
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={!configured}
        />
      </label>
      {state.error && (
        <p role="alert" className="participant-feedback">
          {state.error}
        </p>
      )}
      {!configured && (
        <p className="muted">El acceso de participantes todavía no está disponible.</p>
      )}
      <button className="button primary" disabled={pending || !configured}>
        {pending ? 'Accediendo…' : 'Entrar al paddock'}
      </button>
    </form>
  );
}
export function LineupForm({
  team,
  day,
  roster,
  selected: initial,
  captain: first,
  deadline,
  matchdayTitle,
}: {
  team: string;
  day: string;
  roster: { player_id: string; players: { name: string; mmr: number | null } | null }[];
  selected: string[];
  captain: string;
  deadline: string;
  matchdayTitle: string;
}) {
  const [selected, setSelected] = useState(() =>
    [...new Set(initial)]
      .filter((id) => roster.some((player) => player.player_id === id))
      .slice(0, 6),
  );
  const [captain, setCaptain] = useState(first);
  const [state, action, pending] = useActionState(saveLineup, {});
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setClosed(Date.now() >= Date.parse(deadline)), 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  function toggle(id: string) {
    if (selected.includes(id)) {
      setSelected(selected.filter((x) => x !== id));
      if (captain === id) setCaptain('');
    } else if (selected.length < 6) setSelected([...selected, id]);
  }
  return (
    <form action={action} className="participant-form">
      <input type="hidden" name="team" value={team} />
      <input type="hidden" name="matchday" value={day} />
      {selected.map((id) => (
        <input key={id} type="hidden" name="starter" value={id} />
      ))}
      <div className="toolbar">
        <h2>Parrilla titular</h2>
        <span className="badge">{selected.length} / 6</span>
      </div>
      <div className="lineup-board">
        <aside className="lineup-info" aria-label="Información de la jornada">
          <Countdown at={deadline} />
          <div className="lineup-info-main">
            <span className="eyebrow">Jornada</span>
            <h3>{matchdayTitle}</h3>
            <p>Seis titulares, cuatro reservas y un capitán.</p>
          </div>
          <div className="lineup-info-help">
            <p>Selecciona la corona de un titular para elegir capitán · puntos × 1,5.</p>
            <p role="status">
              {state.error ||
                state.success ||
                (closed
                  ? 'La alineación está bloqueada.'
                  : 'Selecciona seis titulares y un capitán para guardar.')}
            </p>
          </div>
        </aside>
        <div className="lineup-starters">
          <div className="participant-grid">
            {Array.from({ length: 6 }, (_, i) => {
              const r = roster.find((r) => r.player_id === selected[i]);
              return (
                <div
                  className={`lineup-card ${r ? 'is-filled' : 'is-empty'} ${r && captain === r.player_id ? 'is-captain' : ''}`}
                  key={i}
                >
                  <div className="grid-box">
                    <span className="grid-position" aria-label={`Posición ${i + 1}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {r && (
                      <label className="captain-choice">
                        <input
                          type="radio"
                          name="captain"
                          value={r.player_id}
                          checked={captain === r.player_id}
                          onChange={() => setCaptain(r.player_id)}
                          disabled={closed}
                          aria-label={`Elegir a ${r.players?.name} como capitán`}
                        />
                        <Crown size={24} aria-hidden="true" />
                        <span>{captain === r.player_id ? 'Capitán' : 'Elegir'}</span>
                      </label>
                    )}
                  </div>
                  <strong>{r?.players?.name ?? 'Plaza disponible'}</strong>
                  {r && (
                    <div className="lineup-card-actions">
                      <button
                        type="button"
                        disabled={closed}
                        onClick={() => toggle(r.player_id)}
                        className="button secondary"
                      >
                        A reservas
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <aside className="lineup-bench" aria-label="Reservas">
          <h2>
            Reservas <span>{roster.length - selected.length} / 4</span>
          </h2>
          <div className="participant-grid reserve-grid">
            {roster
              .filter((r) => !selected.includes(r.player_id))
              .map((r) => (
                <div className="participant-slot" key={r.player_id}>
                  <strong>{r.players?.name}</strong>
                  <span className="muted">MMR {r.players?.mmr ?? '—'}</span>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={selected.length >= 6 || closed}
                    onClick={() => toggle(r.player_id)}
                  >
                    A titulares
                  </button>
                </div>
              ))}
            {Array.from({ length: Math.max(0, 4 - (roster.length - selected.length)) }, (_, i) => (
              <div key={i} className="participant-slot">
                <span className="muted">Reserva disponible</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
      <button
        className="button primary"
        disabled={pending || closed || selected.length !== 6 || !captain}
      >
        {pending ? 'Guardando…' : 'Guardar alineación'}
      </button>
    </form>
  );
}
export function ScoreForm({
  team,
  day,
  player,
  name,
  one,
  two,
}: {
  team: string;
  day: string;
  player: string;
  name: string;
  one?: number;
  two?: number;
}) {
  const [first, setFirst] = useState(one?.toString() ?? '');
  const [second, setSecond] = useState(two?.toString() ?? '');
  const [enteredAsSub, setEnteredAsSub] = useState(false);
  const [state, action, pending] = useActionState(saveScore, {});
  return (
    <form action={action} className="participant-score">
      <input type="hidden" name="team" value={team} />
      <input type="hidden" name="matchday" value={day} />
      <input type="hidden" name="player" value={player} />
      <div className="score-player">
        <strong>{name}</strong>
        <p role="status" className="muted">
          {state.error ||
            state.success ||
            (one !== undefined ? 'Guardado · pendiente de validación' : 'Pendiente')}
        </p>
      </div>
      <label className="field">
        Carrera 1
        <input
          name="gameOne"
          aria-label={`Carrera 1 de ${name}`}
          type="number"
          min={enteredAsSub ? 0 : 12}
          max="180"
          step="1"
          required
          value={first}
          onChange={(e) => setFirst(e.target.value)}
          placeholder={enteredAsSub ? '0–180' : '12–180'}
        />
      </label>
      <label className="field">
        Carrera 2
        <input
          name="gameTwo"
          required
          aria-label={`Carrera 2 de ${name}`}
          type="number"
          min={enteredAsSub ? 0 : 12}
          max="180"
          step="1"
          value={second}
          onChange={(e) => setSecond(e.target.value)}
          placeholder={enteredAsSub ? '0–180' : '12–180'}
        />
      </label>
      <label className="sub-score-toggle">
        <input
          type="checkbox"
          name="enteredAsSub"
          checked={enteredAsSub}
          onChange={(e) => setEnteredAsSub(e.target.checked)}
        />
        <span>Entró como Sub</span>
        <small>Permite puntuar menos de 12</small>
      </label>
      <div className="participant-total">
        <span className="muted">Total</span>
        <output>{first !== '' && second !== '' ? Number(first) + Number(second) : '—'}</output>
      </div>
      <button className="button primary" disabled={pending}>
        {pending ? 'Guardando…' : 'Guardar'}
      </button>
    </form>
  );
}
