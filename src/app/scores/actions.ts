'use server';
import { revalidatePath } from 'next/cache';
import { participantData } from '@/components/participant-data';
export async function saveScore(
  _: { error?: string; success?: string },
  form: FormData,
): Promise<{ error?: string; success?: string }> {
  const { db, team } = await participantData();
  if (!team || team.id !== form.get('team')) return { error: 'Equipo no autorizado.' };
  const first = Number(form.get('gameOne')),
    raw = String(form.get('gameTwo') ?? '').trim(),
    second = raw ? Number(raw) : null;
  const enteredAsSub = form.get('enteredAsSub') === 'on';
  const minimum = enteredAsSub ? 0 : 12;
  if (
    second === null ||
    !Number.isInteger(first) ||
    first < minimum ||
    first > 180 ||
    (second !== null && (!Number.isInteger(second) || second < minimum || second > 180))
  )
    return {
      error: enteredAsSub
        ? 'Cada carrera debe tener entre 0 y 180 puntos enteros.'
        : 'Cada carrera debe tener entre 12 y 180 puntos enteros.',
    };
  const { error } = await db.rpc('submit_player_weekly_score', {
    target_team: team.id,
    target_matchday: form.get('matchday'),
    target_player: form.get('player'),
    first_game: first,
    second_game: second,
  });
  if (error) return { error: error.message };
  revalidatePath('/scores');
  return { success: 'Guardado · pendiente de validación' };
}
