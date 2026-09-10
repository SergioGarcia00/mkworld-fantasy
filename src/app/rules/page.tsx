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
        <h2>La economía, paso a paso</h2>
        <div className="rules-grid">
          <div>
            <h3>Presupuesto y saldo</h3>
            <p>
              Empiezas con 100.000.000 €. El saldo disponible es el dinero que puedes gastar ahora;
              el valor de plantilla es lo que valen tus pilotos; el patrimonio suma ambos conceptos.
            </p>
          </div>
          <div>
            <h3>Cómo se resuelve una puja</h3>
            <p>
              Durante el mercado escribes un importe, lo confirmas y puedes actualizarlo antes del
              cierre. Al terminar el plazo, la administración aplica las pujas válidas y el saldo se
              ajusta.
            </p>
          </div>
          <div>
            <h3>Comprar y vender</h3>
            <p>
              Antes de confirmar una venta aparece un resumen con el piloto y el importe. Aceptar
              libera el jugador y devuelve a tu saldo el precio de venta establecido por la liga.
            </p>
          </div>
          <div>
            <h3>Protección</h3>
            <p>
              La cláusula es una cantidad que protege a un piloto frente a movimientos según las
              reglas económicas de la liga. Se introduce desde un modal y queda visible en tu
              parrilla.
            </p>
          </div>
        </div>
        <div className="rules-callout">
          <b>Ejemplo:</b> si tu saldo es 39 M€ y ganas una puja de 8 M€, tu saldo baja a 31 M€ y el
          valor de plantilla aumenta con el piloto incorporado.
        </div>
      </section>
      <section className="rules-section">
        <h2>Qué pasa durante cada jornada</h2>
        <ol className="rules-steps">
          <li>
            <b>Mercado abierto</b>
            <span>Puedes estudiar, pujar, actualizar ofertas y vender.</span>
          </li>
          <li>
            <b>Mercado cerrado</b>
            <span>Las ofertas quedan bloqueadas y se resuelven las operaciones.</span>
          </li>
          <li>
            <b>Alineación abierta</b>
            <span>Ordena tu parrilla, elige seis titulares y un capitán.</span>
          </li>
          <li>
            <b>Alineación cerrada</b>
            <span>La última alineación guardada queda fijada para competir.</span>
          </li>
          <li>
            <b>Resultados</b>
            <span>Se cargan las dos carreras y se registran los puntos.</span>
          </li>
          <li>
            <b>Validación</b>
            <span>Administración revisa, corrige si hace falta y publica.</span>
          </li>
        </ol>
      </section>
      <section className="rules-section">
        <h2>Cómo introducir puntos correctamente</h2>
        <p>
          En Puntuaciones selecciona la jornada y completa las dos carreras de cada piloto alineado.
          Escribe números enteros dentro del rango permitido, revisa el total y pulsa Guardar. Si el
          piloto entró como sustituto, marca “Entró como Sub” antes de guardar para habilitar menos
          de 12 puntos.
        </p>
        <ul>
          <li>Una casilla vacía significa que todavía falta información.</li>
          <li>Un resultado guardado puede quedar pendiente de validación.</li>
          <li>La clasificación no cambia hasta que la jornada está validada.</li>
          <li>
            Si el total no coincide, revisa carrera 1, carrera 2 y el multiplicador del capitán.
          </li>
        </ul>
      </section>
      <section className="rules-section">
        <h2>Estados y avisos que verás</h2>
        <div className="rules-grid">
          <div>
            <h3>Pendiente</h3>
            <p>La jornada o tus datos todavía esperan una acción.</p>
          </div>
          <div>
            <h3>Próximamente</h3>
            <p>La jornada existe, pero aún no está abierta para jugar.</p>
          </div>
          <div>
            <h3>En curso</h3>
            <p>El mercado o la alineación están dentro de su horario.</p>
          </div>
          <div>
            <h3>Validada</h3>
            <p>Los puntos ya cuentan oficialmente para la clasificación.</p>
          </div>
        </div>
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
