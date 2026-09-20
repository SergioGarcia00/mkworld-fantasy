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

export function lineupCloseFor(
  startAt: string,
  settings: { first_week_mode?: boolean | null; first_week_market_date?: string | null } | null,
) {
  if (settings?.first_week_mode && settings.first_week_market_date) {
    return new Date(`${settings.first_week_market_date}T19:00:00+02:00`).toISOString();
  }
  return madridWeek(new Date(startAt)).lineupClose;
}

export async function competitionWeek() {
  const settings = await practiceSettings();
  const week = madridWeek();
  if (settings?.first_week_mode) {
    const marketDay = settings.first_week_market_date ?? '2026-09-16';
    const isSunday = marketDay === '2026-09-20';
    const close = isSunday ? '18:00' : '23:00';
    const marketClose = new Date(`${marketDay}T${close}:00+02:00`);
    return {
      ...week,
      manual: false,
      firstWeek: true,
      week: marketDay,
      // A market cannot remain open after its configured daily deadline,
      // even if the admin flag was left enabled in app_config.
      marketOpen: Boolean(settings.first_week_market_open) && Date.now() < marketClose.getTime(),
      marketClose: marketClose.toISOString(),
      lineupClose: new Date(`${marketDay}T19:00:00+02:00`).toISOString(),
      marketCloseLabel: `${new Intl.DateTimeFormat('es-ES', { weekday: 'long', timeZone: 'Europe/Madrid' }).format(new Date(`${marketDay}T12:00:00+02:00`))} · ${close}`,
    };
  }
  return settings?.test_mode
    ? {
        ...week,
        manual: true,
        firstWeek: false,
        week: settings.test_market_week!,
        marketOpen: settings.test_market_open ?? false,
        marketCloseLabel: undefined,
      }
    : { ...week, manual: false, firstWeek: false, marketCloseLabel: undefined };
}
