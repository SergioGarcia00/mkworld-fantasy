/* Dynamic Supabase relations are checked by PostgreSQL; the inherited client schema only covers core tables. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { currentProfile } from '@/lib/auth';
export async function participantData() {
  const profile = await currentProfile();
  if (!profile) redirect('/login');
  const db: any = await createClient();
  const { data: team, error } = await db
    .from('fantasy_teams')
    .select('id,name,budget')
    .eq('user_id', profile.id)
    .maybeSingle();
  if (error) throw new Error('No se pudo cargar tu equipo. Inténtalo de nuevo.');
  const { data: roster, error: rosterError } = team
    ? await db
        .from('fantasy_roster_players')
        .select(
          'player_id,purchase_price,clause_protection_amount,clause_protected_until,players(name,slug,market_value,mmr,teams(name))',
        )
        .eq('fantasy_team_id', team.id)
    : { data: [], error: null };
  if (rosterError) throw new Error('No se pudo cargar tu plantilla.');
  return { db, profile, team, roster: roster ?? [] };
}
export const euros = (n: number) =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
export const squadValue = (roster: Array<{ players?: { market_value?: number | null } | null }>) =>
  roster.reduce((sum, row) => sum + Number(row.players?.market_value ?? 0), 0);
