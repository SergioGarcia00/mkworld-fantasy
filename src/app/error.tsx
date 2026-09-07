'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="error-state">
      <h1>No hemos podido cargar esta página.</h1>
      <p className="muted">La competición sigue aquí. Vuelve a intentarlo en unos instantes.</p>
      <button className="button primary" onClick={reset}>
        Volver a intentar
      </button>
    </div>
  );
}
