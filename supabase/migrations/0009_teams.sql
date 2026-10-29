-- Teams for crests and colours on the match cards. Filled once per season by scripts/sync-teams.mts
-- from football-data.org, keyed by its team id. Crests belong to their clubs and are only shown to
-- identify teams.

create table public.teams (
  football_data_id  integer not null,
  league_code       text not null,            -- football-data.org code, e.g. 'SA'
  name              text not null,            -- "AS Roma"
  short_name        text,                     -- "Roma"
  tla               text,                     -- "ROM"
  crest_url         text,
  club_colors       text,                     -- as football-data.org writes them, e.g. "Maroon / Orange / White"
  updated_at        timestamptz not null default now(),
  -- A club can be in two competitions (its league and the Champions League), so one row per league.
  primary key (football_data_id, league_code)
);

-- Public data, so anyone can read it. Only the sync script writes.
alter table public.teams enable row level security;
create policy "Anyone can read teams" on public.teams for select to anon, authenticated using (true);
