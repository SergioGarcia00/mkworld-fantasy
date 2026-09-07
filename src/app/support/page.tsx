import Link from 'next/link';
import { PageHeading } from '@/components/ui';
export const metadata = { title: 'Soporte' };
export default function Support() {
  return (
    <div className="rules">
      <PageHeading
        title="Te ayudamos a volver a pista"
        description="Resuelve las dudas más habituales sobre tu acceso y la competición."
      />
      <section>
        <h2>No puedo acceder</h2>
        <p>
          Comprueba el usuario y la contraseña que te entregó la administración. Las cuentas se
          crean manualmente. Si necesitas recuperar el acceso, contacta con la persona que te dio
          las credenciales a través del canal habitual de la liga.
        </p>
        <Link href="/login" className="text-link">
          Volver al acceso
        </Link>
      </section>
      <section>
        <h2>No puedo fichar o cambiar mi alineación</h2>
        <p>
          Los fichajes cierran el viernes a las 23:59 y la alineación el sábado a las 23:59, hora de
          Madrid. Comprueba también tu presupuesto y los espacios de tu plantilla.
        </p>
        <Link href="/rules" className="text-link">
          Consultar el reglamento
        </Link>
      </section>
      <section>
        <h2>No aparecen los puntos</h2>
        <p>
          La clasificación solo incluye resultados validados. Consulta el calendario para conocer el
          estado de cada jornada.
        </p>
        <Link href="/calendar" className="text-link">
          Ver calendario
        </Link>
      </section>
    </div>
  );
}
