import { PageHeading, Timeline } from '@/components/ui';
export const metadata = { title: 'Reglamento' };
export default function Rules() {
  return (
    <div className="rules">
      <PageHeading
        title="El reglamento de la pista"
        description="Las reglas de MKWorld Fantasy. Una única liga oficial: Atlas League."
      />
      <section>
        <h2>Tu plantilla</h2>
        <p>
          Cada participante dispone de 100.000.000 € de presupuesto inicial para formar una
          plantilla de 10 jugadores: 6 titulares y 4 reservas. El capitán se elige entre los
          titulares y multiplica sus puntos por 1,5.
        </p>
      </section>
      <section>
        <h2>Una semana de competición</h2>
        <Timeline />
        <p>
          Todos los horarios se interpretan en Europe/Madrid, incluido el cambio de horario de
          verano. El domingo se disputan dos carreras.
        </p>
      </section>
      <section>
        <h2>Diez oportunidades en el mercado</h2>
        <ul>
          <li>2 jugadores con MMR superior a 9.000.</li>
          <li>6 jugadores con MMR entre 4.000 y 5.000, ambos incluidos.</li>
          <li>1 jugador con MMR inferior a 4.000.</li>
          <li>1 jugador de Code Genius.</li>
        </ul>
        <p>
          El mercado se genera el lunes a las 01:00 y los fichajes cierran el viernes a las 23:59.
          La alineación cierra el sábado a las 23:59.
        </p>
      </section>
      <section>
        <h2>Puntuación y resultados</h2>
        <p>
          Cada piloto registra dos carreras de entre 12 y 180 puntos. Se suman los puntos de los
          seis titulares y se aplica el multiplicador del capitán. La clasificación oficial aparece
          después de la validación de la jornada por administración.
        </p>
      </section>
      <section>
        <h2>Participantes y espectadores</h2>
        <p>
          La administración crea las cuentas de participantes y entrega sus credenciales de usuario
          y contraseña. No hay registro público. Los espectadores pueden consultar pilotos, equipos,
          jornadas, noticias y resultados sin iniciar sesión.
        </p>
      </section>
    </div>
  );
}
