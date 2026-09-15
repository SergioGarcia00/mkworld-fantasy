import Link from 'next/link';
import { practiceSettings } from '@/lib/practice';
import { createClient } from '@/lib/supabase/server';
import { AdminForm } from './forms';
import { practiceAction } from './practice-actions';

export async function PracticePanel() {
  const settings = await practiceSettings();
  const db = await createClient();
  // Matchdays are an existing dynamic relation in this client contract.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: days, error } = await (db as any)
    .from('matchdays')
    .select('id,number,name,status')
    .order('number');
  if (error) throw new Error('No se pudieron cargar las jornadas.');
  return (
    <section className="panel">
      <h2>Pruebas con la liga actual</h2>
      <p className="muted">
        Practica fichajes, alineaciones y resultados sin horarios. Las pruebas utilizan el dinero,
        las plantillas y la clasificación actuales; los cambios se conservan al volver al calendario
        habitual.
      </p>
      <p className="badge">
        {settings?.test_mode ? 'Modo de pruebas activo' : 'Calendario habitual activo'}
      </p>
      <div className="admin-subsection">
        <h3>Primera semana · 16–20 septiembre 2026</h3>
        <p className="muted">
          El miércoles a las 10:00 se repartirán 8 pilotos por participante: 2 de cada banda (aprox.
          9000, 6000, 4000 y 2000 MMR). El reparto equilibra el valor total entre equipos. Después
          habrá una subasta diaria de 10:00 a 23:00 y una tienda nueva cada día. El domingo la
          tienda cierra a las 18:00 para que todos confirmen su alineación antes de las 19:00,
          cuando empieza Atlas League.
        </p>
        <AdminForm
          action={practiceAction}
          label={
            settings?.first_week_initialized
              ? 'Primera semana ya preparada'
              : 'Preparar primera semana'
          }
        >
          <input type="hidden" name="operation" value="first_prepare" />
          {settings?.first_week_initialized && (
            <p className="muted">
              Ya se ha hecho el reparto inicial. No se puede repetir para evitar duplicar o mover
              plantillas.
            </p>
          )}
        </AdminForm>
        {settings?.first_week_mode && (
          <>
            <div className="grid-2">
              <AdminForm action={practiceAction} label="Actualizar ahora">
                <input type="hidden" name="operation" value="first_tick" />
                <p className="muted">
                  Ejecuta la transición correspondiente a la hora actual. El cron de Supabase
                  también la ejecutará automáticamente si está disponible.
                </p>
              </AdminForm>
              <AdminForm action={practiceAction} label="Generar tienda del día">
                <input type="hidden" name="operation" value="first_shop" />
                <label className="field">
                  Día
                  <select name="day" defaultValue="2026-09-16">
                    {['2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20'].map(
                      (day) => (
                        <option key={day}>{day}</option>
                      ),
                    )}
                  </select>
                </label>
              </AdminForm>
            </div>
            <AdminForm action={practiceAction} label="Cerrar y adjudicar día">
              <input type="hidden" name="operation" value="first_settle" />
              <label className="field">
                Día
                <select name="day" defaultValue={settings.first_week_market_date ?? '2026-09-16'}>
                  {['2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20'].map(
                    (day) => (
                      <option key={day}>{day}</option>
                    ),
                  )}
                </select>
              </label>
            </AdminForm>
          </>
        )}
      </div>
      <AdminForm action={practiceAction} label="Guardar controles">
        <input type="hidden" name="operation" value="controls" />
        <label>
          <input type="checkbox" name="enabled" defaultChecked={settings?.test_mode} /> Activar modo
          de pruebas sin horarios
        </label>
        <label className="field">
          Jornada de pruebas
          <select name="day" defaultValue={settings?.test_matchday_id ?? ''}>
            <option value="">Selecciona una jornada</option>
            {days.map((day: { id: string; number: number; name: string; status: string }) => (
              <option key={day.id} value={day.id} disabled={day.status === 'FINISHED'}>
                J{day.number} · {day.name}
                {day.status === 'FINISHED' ? ' · Finalizada' : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input type="checkbox" name="market" defaultChecked={settings?.test_market_open} />{' '}
          Mercado abierto: pujas, ventas y cláusulas
        </label>
        <label>
          <input type="checkbox" name="lineup" defaultChecked={settings?.test_lineup_open} />{' '}
          Permitir guardar alineaciones
        </label>
        <label>
          <input type="checkbox" name="scores" defaultChecked={settings?.test_scores_open} />{' '}
          Permitir enviar puntos
        </label>
        <p className="muted">
          Desmarca cada control para cerrarlo. En pruebas, las cláusulas no tienen espera temporal y
          los resultados nunca cierran la jornada automáticamente. Desactivar el modo restablece los
          horarios habituales.
        </p>
      </AdminForm>
      <div className="admin-subsection">
        <h3>Preparar otra jornada</h3>
        <AdminForm action={practiceAction} label="Crear jornada">
          <input type="hidden" name="operation" value="create" />
          <label className="field">
            Nombre
            <input name="name" required maxLength={100} placeholder="Entrenamiento beta" />
          </label>
        </AdminForm>
        <p className="muted">
          Después de crearla, selecciónala arriba y guarda los controles. No necesita fechas.
        </p>
      </div>
      {settings?.test_mode && (
        <div className="admin-subsection">
          <h3>Mercado manual</h3>
          <p className="muted">
            Las ofertas se mantienen hasta generar otra ronda. Generar una ronda nueva cierra las
            pujas de la anterior; adjudícala primero si quieres realizar esos fichajes.
          </p>
          <div className="grid-2">
            <AdminForm action={practiceAction} label="Generar otra ronda de ofertas">
              <input type="hidden" name="operation" value="market" />
            </AdminForm>
            <AdminForm action={practiceAction} label="Cerrar y adjudicar pujas">
              <input type="hidden" name="operation" value="settle" />
              <p className="muted">
                Mayor puja con saldo y plaza disponible. Empates: primera puja. Los fichajes
                descuentan el dinero y entran en la plantilla.
              </p>
            </AdminForm>
          </div>
        </div>
      )}
      <p>
        <Link href="/admin?tab=matchdays">Revisar, calcular y finalizar jornadas</Link> ·{' '}
        <Link href="/admin?tab=accounts">Gestionar participantes beta</Link>
      </p>
    </section>
  );
}
