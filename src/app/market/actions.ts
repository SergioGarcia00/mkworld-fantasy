'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { participantData } from '@/components/participant-data';
import { competitionWeek } from '@/lib/practice';
export async function placeBid(form: FormData) {
  const { db, team } = await participantData();
  if (!team || team.id !== form.get('team')) redirect('/market?error=Equipo%20no%20autorizado');
  const week = await competitionWeek();
  if (!week.marketOpen) redirect('/market?error=El%20mercado%20está%20cerrado');
  const amount = Number(form.get('amount'));
  if (!Number.isInteger(amount) || amount <= 0)
    redirect('/market?error=Indica%20una%20puja%20válida');
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
  const { error } = await db.rpc('sell_player', {
    target_fantasy_team: team.id,
    target_player: form.get('player'),
  });
  if (error) redirect(`/my-team?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/market');
  revalidatePath('/my-team');
  redirect('/my-team?success=Venta%20completada');
}
export async function protectClause(form: FormData) {
  const { db, team } = await participantData();
  if (!team || team.id !== form.get('team')) redirect('/my-team?error=Equipo%20no%20autorizado');
  const spend = Number(form.get('amount'));
  if (!Number.isInteger(spend) || spend <= 0)
    redirect('/my-team?error=Indica%20un%20importe%20entero%20mayor%20que%20cero');
  const { error } = await db.rpc('protect_player_clause', {
    target_team: team.id,
    target_player: form.get('player'),
    spend_amount: spend,
    idempotency: `protect:${team.id}:${form.get('player')}:${Date.now()}`,
  });
  if (error) redirect(`/my-team?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/my-team');
  redirect('/my-team?success=Cláusula%20protegida');
}
export async function payClause(form: FormData) {
  const { db } = await participantData();
  const { error } = await db.rpc('pay_player_clause', {
    target_player: form.get('player'),
    idempotency: `clause:${form.get('player')}:${Date.now()}`,
  });
  const returnTo = form.get('returnTo') === '/users' ? '/users' : '/my-team';
  if (error) redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/my-team');
  revalidatePath('/users');
  redirect(`${returnTo}?success=Jugador%20fichado`);
}
