import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="error-state">
      <h1>Esta ruta está fuera de pista.</h1>
      <p className="muted">No encontramos la página que buscas.</p>
      <Link href="/" className="button primary">
        Volver a vista general
      </Link>
    </div>
  );
}
