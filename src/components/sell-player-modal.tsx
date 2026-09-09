'use client';

import { useRef } from 'react';
import { sellPlayer } from '@/app/market/actions';

export function SellPlayerModal({
  team,
  player,
  name,
  value,
  salePrice,
  disabled,
}: {
  team: string;
  player: string;
  name: string;
  value: string;
  salePrice: string;
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
        Vender
      </button>
      <dialog ref={ref} className="protect-dialog sell-dialog">
        <form action={sellPlayer} className="protect-dialog-form">
          <input type="hidden" name="team" value={team} />
          <input type="hidden" name="player" value={player} />
          <h3>¿Vender a {name}?</h3>
          <p className="muted">Valor actual: {value}</p>
          <p>
            Recibirás <strong>{salePrice}</strong> en tu saldo.
          </p>
          <p className="muted">La venta se ejecutará inmediatamente y liberará esta plaza.</p>
          <div className="protect-dialog-actions">
            <button type="button" className="button secondary" onClick={() => ref.current?.close()}>
              Cancelar
            </button>
            <button className="button primary">Confirmar venta</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
