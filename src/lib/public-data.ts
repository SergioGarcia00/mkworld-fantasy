import 'server-only';
/* Dynamic Supabase relations are added by migrations and may lag generated types. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { cache } from 'react';
import source from '../../atlas-fantasy-s3-mmr-FINAL.json';
import { getCatalog } from './catalog';
import { createClient } from './supabase/server';
import { practiceSettings } from './practice';
import { isConfigured } from './supabase/env';

export const publicCatalog = cache(async () => {
  // Players and teams pages do not render historical statistics. Avoid loading
  // that large relation just to build their public catalogue.
  const [catalog, enriched] = await Promise.all([
    getCatalog(false).catch(() => null),
    isConfigured()
      ? (async () => {
          try {
            const db: any = await createClient();
            const rows: any[] = [];
            for (let offset = 0; ; offset += 500) {
              const { data, error } = await db
                .from('player_enriched_details')
                .select('*')
                .eq('season_number', 3)
                .order('mkcentral_player_id')
                .range(offset, offset + 499);
              if (error) throw error;
              rows.push(...(data ?? []));
              if (!data || data.length < 500) break;
            }
            return rows;
          } catch {
            return [];
          }
        })()
      : Promise.resolve([]),
  ]);
  const livePlayers = new Map(
    catalog?.players.map((player) => [String(player.mkcentral_player_id), player]),
  );
  const details = new Map(enriched.map((row: any) => [String(row.mkcentral_player_id), row]));
  const players = source.jugadores
    .filter((row) => row.jugador.trim().toLocaleLowerCase('es') !== 'breve')
    .map((row) => {
      const live = livePlayers.get(String(row.player_id));
      const detail = details.get(String(row.player_id));
      return {
        id: String(row.player_id),
        databaseId: live?.id ?? null,
        slug: live?.slug ?? String(row.player_id),
        name: row.jugador,
        team: row.equipo,
        mmr: row.mmr_s3_12p,
        rank: row.rank_s3_12p,
        peak: row.peak_mmr_s3_12p,
        events: row.events_s3_12p,
        price: live?.market_value ?? null,
        profile: row.mkcentral_profile,
        detail,
      };
    });
  const teams = [...new Set(players.map((p) => p.team))].sort((a, b) => a.localeCompare(b, 'es'));
  return { players, teams, offline: !catalog || catalog.mode === 'preview' };
});
export type PublicPlayer = Awaited<ReturnType<typeof publicCatalog>>['players'][number];
export type News = {
  id: string;
  title: string;
  body: string;
  category: string;
  created_at: string;
};
export type Matchday = {
  id: string;
  number: number;
  name: string;
  status: string;
  start_at: string;
  end_at: string;
};
export type ChatMessage = {
  id: string;
  body: string;
  created_at: string;
  profiles: { display_name: string } | null;
};
export const leagueFeed = cache(async () => {
  const empty = {
    news: [] as News[],
    days: [] as Matchday[],
    messages: [] as ChatMessage[],
    unavailable: false,
    newsUnavailable: false,
    daysUnavailable: false,
    chatUnavailable: false,
  };
  if (!isConfigured()) return empty;
  try {
    const db = await createClient();
    const [news, days, messages] = await Promise.all([
      db
        .from('news_posts')
        .select('id,title,body,category,created_at')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(30),
      db.from('matchdays').select('id,number,name,status,start_at,end_at').order('number'),
      db.rpc('spectator_chat', {}),
    ]);
    return {
      news: (news.data ?? []) as News[],
      days: (days.data ?? []) as Matchday[],
      messages: (messages.data ?? []).map((m) => ({
        ...m,
        profiles: { display_name: m.display_name },
      })),
      unavailable: Boolean(news.error || days.error),
      newsUnavailable: Boolean(news.error),
      daysUnavailable: Boolean(days.error),
      chatUnavailable: Boolean(messages.error),
    };
  } catch {
    return {
      ...empty,
      unavailable: true,
      newsUnavailable: true,
      daysUnavailable: true,
      chatUnavailable: true,
    };
  }
});

// The shell only needs the active jornada. Keeping this separate avoids loading
// news and chat before every page can render.
export const currentMatchday = cache(async () => {
  const practice = await practiceSettings();
  if (practice?.test_mode) {
    const feed = await leagueFeed();
    return feed.days.find((day) => day.id === practice.test_matchday_id) ?? null;
  }
  if (!isConfigured()) return null;
  try {
    const db = await createClient();
    const { data } = await db
      .from('matchdays')
      .select('id,number,name,status,start_at,end_at')
      .in('status', ['OPEN', 'UPCOMING'])
      .order('number')
      .limit(1)
      .maybeSingle();
    return (data as Matchday | null) ?? null;
  } catch {
    return null;
  }
});
export const statusLabel = (status: string) =>
  ({
    UPCOMING: 'Próximamente',
    OPEN: 'Jornada abierta',
    LOCKED: 'Alineaciones cerradas',
    FINISHED: 'Resultados validados',
    CLOSED: 'Cerrada',
  })[status] ?? 'Pendiente';
export const number = (value: number | null) =>
  value == null ? '—' : value.toLocaleString('es-ES');
export const money = (value: number | null) =>
  value == null
    ? 'Por publicar'
    : `${(value / 1e6).toLocaleString('es-ES', { maximumFractionDigits: 1 })} M€`;
