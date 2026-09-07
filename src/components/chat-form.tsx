'use client';
import { useActionState } from 'react';
import { sendMessage } from '@/app/chat/actions';
export function ChatForm() {
  const [state, action, pending] = useActionState(sendMessage, {});
  return (
    <form action={action} className="stack">
      <label className="field">
        <span>Tu mensaje</span>
        <textarea name="body" required maxLength={500} placeholder="Comenta la jornada…" />
      </label>
      <p role="status" className="muted">
        {state.error ?? state.success ?? 'Máximo 500 caracteres. Comparte la pista con respeto.'}
      </p>
      <button className="button primary" disabled={pending}>
        {pending ? 'Enviando…' : 'Enviar mensaje'}
      </button>
    </form>
  );
}
