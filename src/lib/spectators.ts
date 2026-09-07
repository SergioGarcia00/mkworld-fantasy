import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { isConfigured } from '@/lib/supabase/env';
import type { PublicLeague } from '@/domain/models';
export const publicLeagues = cache(async (): Promise<PublicLeague[]> => {
  if (!isConfigured()) return [];
  const { data, error } = await (await createClient()).rpc('spectator_leagues', {});
  if (error) throw new Error('No se pudieron cargar las ligas publicadas.');
  return data;
});
