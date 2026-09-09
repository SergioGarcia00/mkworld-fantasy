'use client';
import { useRef } from 'react';
import { protectClause } from '@/app/market/actions';

export function ProtectClauseModal({
  team,
  player,
  name,
  value,
  clause,
  disabled,
}: {
  team: string;
  player: string;
  name: string;
  value: string;
  clause: string;
  disabled: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        className="button secondary compact-action"
        disabled={disabled}
        onClick={() => ref.current?.showModal()}
      >
        Proteger
      </button>
      <dialog ref={ref} className="protect-dialog">
        <form action={protectClause} className="protect-dialog-form">
          <input type="hidden" name="team" value={team} />
          <input type="hidden" name="player" value={player} />
          <h3>Proteger a {name}</h3>
          <p className="muted">Valor actual: {value}</p>
          <p className="muted">Cláusula actual: {clause}</p>
          <label className="field">
            <span>¿Cuánto quieres gastar?</span>
            <input
              name="amount"
              type="number"
              min="1"
              step="50000"
              placeholder="Importe en €"
              required
            />
          </label>
          <div className="protect-dialog-actions">
            <button type="button" className="button secondary" onClick={() => ref.current?.close()}>
              Cancelar
            </button>
            <button className="button primary">Confirmar protección</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
