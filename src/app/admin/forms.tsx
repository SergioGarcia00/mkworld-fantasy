'use client';
import { useActionState, useState, type ReactNode } from 'react';
import type { ActionState, Season } from '@/domain/models';
import { previewImport, confirmImport } from './actions';
export function AdminForm({
  action,
  children,
  label = 'Guardar cambios',
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  children: ReactNode;
  label?: string;
}) {
  const [state, submit, pending] = useActionState(action, {});
  return (
    <form action={submit} className="admin-form">
      {children}
      <button className="button primary" disabled={pending}>
        {pending ? 'Guardando…' : label}
      </button>
      {state.error && (
        <p role="alert" className="admin-error">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="admin-success">
          {state.success}
        </p>
      )}
    </form>
  );
}
export function ImportWorkbench({ seasons }: { seasons: Season[] }) {
  const [text, setText] = useState('');
  const [season, setSeason] = useState(seasons[0]?.id ?? '');
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewImport>> | null>(null);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  async function analyze() {
    setPending(true);
    setMessage('');
    try {
      setPreview(await previewImport(text));
    } catch {
      setMessage('No se pudo analizar el archivo. Vuelve a intentarlo.');
    } finally {
      setPending(false);
    }
  }
  async function save() {
    setPending(true);
    try {
      const result = await confirmImport(text, season);
      setMessage(result.error ?? result.success ?? 'Importación completada.');
      if (result.success) setPreview(null);
    } catch {
      setMessage('No se pudo guardar. Vuelve a intentarlo.');
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="panel admin-form">
      <h2>Importar catálogo</h2>
      <p className="muted">
        Carga un JSON de MKCentral. Revisa los registros antes de incorporarlos a la temporada.
      </p>
      <label className="field">
        Temporada
        <select value={season} onChange={(e) => setSeason(e.target.value)}>
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Archivo JSON
        <input
          type="file"
          accept=".json,application/json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 2097152) {
              setMessage('El archivo supera 2 MB.');
              return;
            }
            setText(await file.text());
            setPreview(null);
          }}
        />
      </label>
      <label className="field">
        Contenido
        <textarea
          rows={10}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setPreview(null);
          }}
          placeholder={'[{"jugador":"Nombre","equipo":"Equipo","mkcentral_player_id":"12345"}]'}
        />
      </label>
      <button className="button secondary" disabled={pending || !text} onClick={analyze}>
        {pending ? 'Procesando…' : 'Analizar importación'}
      </button>
      {preview &&
        (preview.ok ? (
          <div>
            <h3>Vista previa</h3>
            <pre>{JSON.stringify(preview.summary, null, 2)}</pre>
            <ul>
              {preview.sample.map((p, i) => (
                <li key={i}>
                  {p.name} · {p.teamName}
                </li>
              ))}
            </ul>
            <button className="button primary" disabled={pending || !season} onClick={save}>
              Confirmar importación
            </button>
          </div>
        ) : (
          <p role="alert">{preview.error}</p>
        ))}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
export function AdminDirectForm({
  action,
  children,
}: {
  action: (form: FormData) => Promise<void>;
  children: ReactNode;
}) {
  const [state, submit, pending] = useActionState(
    async (_: ActionState, form: FormData): Promise<ActionState> => {
      try {
        await action(form);
        return { success: 'Operación completada.' };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'No se pudo completar la operación.',
        };
      }
    },
    {},
  );
  return (
    <form action={submit} className="admin-form">
      <fieldset
        disabled={pending}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: 'grid', gap: 16 }}
      >
        {children}
      </fieldset>
      {pending && <p role="status">Guardando…</p>}
      {state.error && (
        <p role="alert" className="admin-error">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="admin-success">
          {state.success}
        </p>
      )}
    </form>
  );
}
