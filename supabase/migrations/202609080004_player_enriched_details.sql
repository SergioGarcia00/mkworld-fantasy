-- Enriched player profiles imported from MKCentral / MKWorld Lounge.
-- Kept separate from players so fantasy operations and existing pricing remain untouched.
create table if not exists public.player_enriched_details (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players(id) on delete cascade,
  mkcentral_player_id text not null,
  season_number integer not null check (season_number > 0),
  display_name text,
  team_name text,
  country text,
  tier text,
  mkcentral_profile_url text,
  lounge_profile_id text,
  lounge_profile_url_12p text,
  lounge_profile_url_24p text,
  rank_12p integer,
  mmr_12p integer,
  peak_mmr_12p integer,
  events_played_12p integer,
  stats_12p jsonb not null default '{}'::jsonb check (jsonb_typeof(stats_12p) = 'object'),
  rank_24p integer,
  mmr_24p integer,
  peak_mmr_24p integer,
  events_played_24p integer,
  stats_24p jsonb not null default '{}'::jsonb check (jsonb_typeof(stats_24p) = 'object'),
  events jsonb not null default '[]'::jsonb check (jsonb_typeof(events) = 'array'),
  source text not null default 'lounge.mkcentral.com',
  collected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mkcentral_player_id, season_number),
  unique (player_id, season_number)
);

create index if not exists player_enriched_details_player_idx
  on public.player_enriched_details(player_id, season_number);
create index if not exists player_enriched_details_mkcentral_idx
  on public.player_enriched_details(mkcentral_player_id);

alter table public.player_enriched_details enable row level security;
revoke all on public.player_enriched_details from anon, authenticated;
grant select on public.player_enriched_details to anon, authenticated;
grant all on public.player_enriched_details to service_role;

drop policy if exists player_enriched_details_public_read on public.player_enriched_details;
create policy player_enriched_details_public_read
  on public.player_enriched_details for select
  to anon, authenticated using (true);

create or replace function public.set_player_enriched_details_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists player_enriched_details_updated on public.player_enriched_details;
create trigger player_enriched_details_updated
  before update on public.player_enriched_details
  for each row execute function public.set_player_enriched_details_updated_at();
