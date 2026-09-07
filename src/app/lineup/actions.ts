'use server';
import { revalidatePath } from 'next/cache';
import { participantData } from '@/components/participant-data';
import { madridWeek } from '@/components/participant-time';
export async function saveLineup(
  _: { error?: string; success?: string },
  form: FormData,
): Promise<{ error?: string; success?: string }> {
  const { db, team } = await participantData();
  if (!team || team.id !== form.get('team')) return { error: 'No se pudo identificar tu equipo.' };
  const { data: day, error: queryError } = await db
    .from('matchdays')
    .select('id,status,lock_at,start_at')
    .eq('id', form.get('matchday'))
    .single();
  if (queryError || !day) return { error: 'No se pudo cargar la jornada.' };
  const deadline = Math.min(
    Date.parse(day.lock_at),
    Date.parse(madridWeek(new Date(day.start_at)).lineupClose),
  );
  if (['LOCKED', 'FINISHED'].includes(day.status) || Date.now() >= deadline)
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
