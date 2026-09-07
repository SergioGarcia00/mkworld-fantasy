'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { participantData } from '@/components/participant-data';
import { madridWeek } from '@/components/participant-time';
export async function buyPlayer(form: FormData) {
  const { db, team } = await participantData();
  if (!team || team.id !== form.get('team')) redirect('/market?error=Equipo%20no%20autorizado');
  const week = madridWeek();
  if (!week.marketOpen) redirect('/market?error=El%20mercado%20está%20cerrado');
  const { data: offer } = await db
    .from('market_offers')
    .select('id')
    .eq('week_start', week.week)
    .eq('player_id', form.get('player'))
    .maybeSingle();
  if (!offer) redirect('/market?error=La%20oferta%20ya%20no%20está%20disponible');
  const { error } = await db.rpc('buy_player', {
    target_fantasy_team: team.id,
    target_player: form.get('player'),
  });
  if (error) redirect(`/market?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/market');
  revalidatePath('/my-team');
  redirect('/my-team?success=Fichaje%20completado');
}
export async function sellPlayer(form: FormData) {
  const { db, team } = await participantData();
  if (!team || team.id !== form.get('team')) redirect('/my-team?error=Equipo%20no%20autorizado');
  if (!madridWeek().marketOpen) redirect('/my-team?error=El%20mercado%20está%20cerrado');
  const { error } = await db.rpc('sell_player', {
    target_fantasy_team: team.id,
    target_player: form.get('player'),
  });
  if (error) redirect(`/my-team?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/market');
  revalidatePath('/my-team');
  redirect('/my-team?success=Venta%20completada');
}
