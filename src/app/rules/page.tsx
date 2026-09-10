import { PageHeading, Timeline } from '@/components/ui';

export const metadata = { title: 'Reglamento' };

const faqs = [
  [
    '¿Cuándo tengo que entrar?',
    'Revisa el mercado el lunes, deja tus fichajes listos antes del viernes y confirma la alineación antes del sábado por la noche.',
  ],
  [
    '¿Qué ocurre si no completo la alineación?',
    'La jornada se queda sin una alineación válida. Comprueba siempre que aparecen seis titulares y un capitán.',
  ],
  [
    '¿Puedo cambiar un titular después del cierre?',
    'No. La administración utiliza la última alineación guardada cuando termina el plazo.',
  ],
  ['¿Quién puede modificar puntos?', 'Solo la administración puede validar o corregir resultados.'],
  [
    '¿Qué significa una división?',
    'Es la división y conferencia de la parrilla oficial en la que compite el piloto.',
  ],
];

export default function Rules() {
  return (
    <div className="rules rules-page">
      <PageHeading
        title="Reglamento de Atlas League"
        description="Todo lo que necesitas para jugar, tomar decisiones y seguir una jornada de principio a fin."
      />
      <section className="rules-hero">
        <div>
          <span className="rules-kicker">Guía del participante</span>
          <h2>Tu objetivo es construir la mejor parrilla.</h2>
          <p>
            Gestiona un presupuesto, ficha pilotos, elige seis titulares y convierte sus resultados
            en puntos. Cada semana empieza una nueva oportunidad.
          </p>
        </div>
        <div className="rules-hero-stat">
          <strong>10</strong>
          <span>plazas de plantilla</span>
          <strong>6 + 4</strong>
          <span>titulares y reservas</span>
        </div>
      </section>
      <section className="rules-section rules-section--accent">
        <h2>Cómo se juega en seis pasos</h2>
        <ol className="rules-steps">
          <li>
            <b>Consulta el mercado</b>
            <span>Conoce las diez ofertas disponibles.</span>
          </li>
          <li>
            <b>Planifica tu presupuesto</b>
            <span>Calcula pujas, ventas y cláusulas.</span>
          </li>
          <li>
            <b>Completa tu plantilla</b>
            <span>Forma un grupo de diez pilotos.</span>
          </li>
          <li>
            <b>Guarda tu alineación</b>
            <span>Escoge seis titulares y un capitán.</span>
          </li>
          <li>
            <b>Introduce los resultados</b>
            <span>Registra los puntos de cada carrera.</span>
          </li>
          <li>
            <b>Revisa la clasificación</b>
            <span>Tras la validación, tus puntos pasan al total.</span>
          </li>
        </ol>
      </section>
      <section className="rules-section">
        <h2>El calendario de una jornada</h2>
        <p>
          Los horarios se muestran en Europe/Madrid. El domingo se disputan dos carreras y el lunes
          comienza el siguiente ciclo.
        </p>
        <Timeline />
        <div className="rules-table-wrap">
          <table className="rules-table">
            <thead>
              <tr>
                <th>Momento</th>
                <th>Qué sucede</th>
                <th>Qué debes hacer</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Lunes · 01:00</td>
                <td>Apertura del mercado</td>
                <td>Analiza ofertas y presupuesto.</td>
              </tr>
              <tr>
                <td>Viernes · 23:59</td>
                <td>Cierre de fichajes</td>
                <td>Deja las pujas confirmadas.</td>
              </tr>
              <tr>
                <td>Sábado · 23:59</td>
                <td>Cierre de alineaciones</td>
                <td>Guarda seis titulares y un capitán.</td>
              </tr>
              <tr>
                <td>Domingo</td>
                <td>Día de competición</td>
                <td>Consulta carreras, puntos y noticias.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section className="rules-section">
        <h2>Plantilla y alineación</h2>
        <div className="rules-grid">
          <div>
            <h3>Tu plantilla</h3>
            <p>
              Dispones de <b>100.000.000 €</b> para ocupar diez plazas: seis titulares y cuatro
              reservas.
            </p>
          </div>
          <div>
            <h3>Tu parrilla</h3>
            <p>
              Elige seis titulares y un capitán. Su puntuación se multiplica por <b>1,5</b>.
              Comprueba que el contador indica 6/6.
            </p>
          </div>
        </div>
        <div className="rules-callout">
          <b>Consejo:</b> comprar un piloto no lo coloca automáticamente en una alineación guardada.
        </div>
      </section>
      <section className="rules-section">
        <h2>Mercado, fichajes y economía</h2>
        <div className="rules-grid">
          <div>
            <h3>Ofertas semanales</h3>
            <p>
              Cada semana aparecen diez pilotos con perfiles de MMR variados y una plaza de Code
              Genius según la configuración.
            </p>
          </div>
          <div>
            <h3>Pujar y vender</h3>
            <p>
              Introduce tu importe y confirma. Al vender, la aplicación muestra un resumen y pide
              confirmación.
            </p>
          </div>
          <div>
            <h3>Valor y variación</h3>
            <p>
              El valor y su variación se muestran en formato compacto; la flecha indica subida o
              bajada.
            </p>
          </div>
          <div>
            <h3>Cláusula de protección</h3>
            <p>
              Abre <b>Proteger</b>, indica un importe y confirma para asociar la cláusula al piloto.
            </p>
          </div>
        </div>
      </section>
      <section className="rules-section">
        <h2>Puntuaciones y validación</h2>
        <p>
          Cada piloto tiene dos carreras por jornada. Introduce la puntuación de cada una y la
          aplicación calcula el total. Como regla general, cada carrera admite entre 12 y 180
          puntos.
        </p>
        <div className="rules-callout rules-callout--warning">
          <b>¿Entró como Sub?</b> Marca esa casilla para permitir una puntuación inferior a 12.
        </div>
        <p>
          La administración revisa y valida los datos. Solo las jornadas validadas cuentan para
          clasificación, estadísticas y medias.
        </p>
      </section>
      <section className="rules-section">
        <h2>Clasificación y estadísticas</h2>
        <p>
          La clasificación ordena a los participantes por puntos acumulados en jornadas validadas.
          Consulta total, diferencia con el líder, media por jornada y jornadas contabilizadas.
        </p>
        <div className="rules-grid">
          <div>
            <h3>Clasificación general</h3>
            <p>
              El podio resume las primeras posiciones y la clasificación completa permite revisar a
              todos.
            </p>
          </div>
          <div>
            <h3>Estadísticas de pilotos</h3>
            <p>
              Solo aparecen pilotos con jornadas y puntos Fantasy registrados: propietario, jornadas
              jugadas, puntos totales y media por carrera.
            </p>
          </div>
        </div>
      </section>
      <section className="rules-section">
        <h2>Divisiones, seedings y jornadas de prueba</h2>
        <p>
          Cada piloto pertenece a una división y conferencia según los seedings preliminares de
          Season 3. La administración puede activar una <b>jornada de prueba</b> limitada para
          recorrer mercado, alineación, puntuaciones, validación y clasificación.
        </p>
      </section>
      <section className="rules-section">
        <h2>Checklist antes de cada cierre</h2>
        <ul className="rules-checklist">
          <li>Tu saldo cubre las pujas pendientes.</li>
          <li>Tienes diez plazas ocupadas.</li>
          <li>Hay exactamente seis titulares.</li>
          <li>Has elegido un capitán.</li>
          <li>La alineación aparece como guardada.</li>
          <li>Has revisado la hora local del cierre.</li>
        </ul>
      </section>
      <section className="rules-section rules-faq">
        <h2>Preguntas frecuentes</h2>
        {faqs.map(([question, answer]) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </section>
      <section className="rules-footer">
        <h2>¿Necesitas ayuda?</h2>
        <p>Guarda una captura y contacta con la administración desde Soporte.</p>
      </section>
    </div>
  );
}
