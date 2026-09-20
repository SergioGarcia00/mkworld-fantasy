'use client';

import { useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { sellPlayer } from '@/app/market/actions';

function ConfirmSaleButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="button primary" disabled={pending} aria-busy={pending}>
      {pending ? 'Procesando venta…' : 'Confirmar venta'}
    </button>
  );
}

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
          <p className="muted">Valor de mercado actual: {value}</p>
          <p>
            Recibirás <strong>{salePrice}</strong> en tu saldo.
          </p>
          <p className="muted">Venta inmediata: recibes el 95% del valor de mercado. La cláusula es un importe distinto y solo se aplica a fichajes entre usuarios.</p>
          <p className="muted" aria-live="polite">
            La venta se procesa al instante. Si tarda unos segundos, no pulses de nuevo.
          </p>
          <div className="protect-dialog-actions">
            <button type="button" className="button secondary" onClick={() => ref.current?.close()}>
              Cancelar
            </button>
            <ConfirmSaleButton />
          </div>
        </form>
      </dialog>
    </>
  );
}
