import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { isConfigured } from '@/lib/supabase/env';
import { madridWeek } from '@/components/participant-time';

export const practiceSettings = cache(async () => {
  if (!isConfigured()) return null;
  const { data, error } = await (
    await createClient()
  )
    .from('app_config')
    .select('*')
    .eq('id', true)
    .single();
  if (error) throw new Error('No se pudo cargar el modo de competición.');
  return data;
});
export async function competitionWeek() {
  const settings = await practiceSettings();
  const week = madridWeek();
  return settings?.test_mode
    ? {
        ...week,
        manual: true,
        week: settings.test_market_week!,
        marketOpen: settings.test_market_open ?? false,
      }
    : { ...week, manual: false };
}
