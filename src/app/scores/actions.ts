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
  if (
    second === null ||
    !Number.isInteger(first) ||
    first < 12 ||
    first > 180 ||
    (second !== null && (!Number.isInteger(second) || second < 12 || second > 180))
  )
    return { error: 'Cada carrera debe tener entre 12 y 180 puntos enteros.' };
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
