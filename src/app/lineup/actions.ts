'use server';
import { revalidatePath } from 'next/cache';
import { participantData } from '@/components/participant-data';
import { practiceSettings } from '@/lib/practice';
import { madridWeek } from '@/components/participant-time';
import { lineupBlocker, type LineupBlocker } from './validation';

type LineupActionState = { error?: string; success?: string; blocker?: LineupBlocker };
export async function saveLineup(
  _: LineupActionState,
  form: FormData,
): Promise<LineupActionState> {
  const { db, team, roster } = await participantData();
  if (!team || team.id !== form.get('team')) return { error: 'No se pudo identificar tu equipo.' };
  const blocker = lineupBlocker(roster.length, Number(team.budget));
  if (blocker) {
    return {
      blocker,
      error:
        blocker === 'squad_budget'
          ? 'No puedes guardar la alineación: tienes que tener entre 6 y 10 jugadores y el presupuesto no puede estar en negativo.'
          : blocker === 'squad'
            ? 'No puedes guardar la alineación: tienes que tener entre 6 y 10 jugadores.'
            : 'No puedes guardar la alineación: el presupuesto está en negativo.',
    };
  }
  const { data: day, error: queryError } = await db
    .from('matchdays')
    .select('id,status,lock_at,start_at')
    .eq('id', form.get('matchday'))
    .single();
  if (queryError || !day) return { error: 'No se pudo cargar la jornada.' };
  const practice = await practiceSettings();
  if (
    practice?.test_mode &&
    (day.id !== practice.test_matchday_id ||
      !practice.test_lineup_open ||
      day.status === 'FINISHED')
  )
    return { error: 'Alineaciones cerradas por administración.' };
  const deadline = Math.min(
    Date.parse(day.lock_at),
    Date.parse(madridWeek(new Date(day.start_at)).lineupClose),
  );
  if (
    !practice?.test_mode &&
    (['LOCKED', 'FINISHED'].includes(day.status) || Date.now() >= deadline)
  )
    return { error: 'El plazo ha terminado. La alineación está bloqueada.' };
  const starters = form.getAll('starter').map(String),
    captain = String(form.get('captain'));
  if (new Set(starters).size !== 6 || !starters.includes(captain))
    return { error: 'Elige seis titulares distintos y un capitán entre ellos.' };
  const { error } = await db.rpc('save_lineup', {
    target_team: team.id,
    target_matchday: day.id,
    starters,
    captain,
  });
  if (error) return { error: error.message };
  revalidatePath('/lineup');
  revalidatePath('/my-team');
  return { success: 'Alineación guardada.' };
}

