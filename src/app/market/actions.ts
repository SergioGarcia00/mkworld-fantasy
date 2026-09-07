'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { participantData } from '@/components/participant-data';
import { madridWeek } from '@/components/participant-time';
export async function placeBid(form: FormData) {
  const { db, team } = await participantData();
  if (!team || team.id !== form.get('team')) redirect('/market?error=Equipo%20no%20autorizado');
  const week = madridWeek();
  if (!week.marketOpen) redirect('/market?error=El%20mercado%20está%20cerrado');
  const amount = Number(form.get('amount'));
  if (!Number.isInteger(amount) || amount <= 0) redirect('/market?error=Indica%20una%20puja%20válida');
  const { error } = await db.rpc('place_market_bid', {
    target_team: team.id,
    target_player: form.get('player'),
    bid_amount: amount,
  });
  if (error) redirect(`/market?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/market');
  redirect('/market?success=Puja%20registrada');
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
