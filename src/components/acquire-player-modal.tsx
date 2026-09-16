'use client';

import { useRef } from 'react';
import { payClause } from '@/app/market/actions';

export function AcquirePlayerModal({
  player,
  name,
  owner,
  clause,
  disabled,
  reason,
}: {
  player: string;
  name: string;
  owner: string;
  clause: string;
  disabled: boolean;
  reason?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        className="button primary compact-action"
        disabled={disabled}
        title={reason}
        onClick={() => ref.current?.showModal()}
      >
        {disabled && reason ? 'Protegido' : 'Fichar'}
      </button>
      {!disabled && (
        <dialog ref={ref} className="protect-dialog sell-dialog">
          <form action={payClause} className="protect-dialog-form">
            <input type="hidden" name="player" value={player} />
            <input type="hidden" name="returnTo" value="/users" />
            <h3>¿Fichar a {name}?</h3>
            <p className="muted">Actualmente pertenece a {owner}.</p>
            <p>
              Pagarás la cláusula completa de <strong>{clause}</strong>. El jugador pasará a tu
              plantilla y el propietario recibirá el importe.
            </p>
            <div className="protect-dialog-actions">
              <button type="button" className="button secondary" onClick={() => ref.current?.close()}>
                Cancelar
              </button>
              <button className="button primary">Confirmar fichaje</button>
            </div>
          </form>
        </dialog>
      )}
    </>
  );
}
