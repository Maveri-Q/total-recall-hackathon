-- The data job: upcoming matches, the odds readings taken before kickoff, and a log of each run.
-- Only the data job writes here (with the secret key). Anyone can read matches and readings.

create table public.matches (
  id                    uuid primary key default gen_random_uuid(),
  league_code           text not null,                 -- football-data.org code, e.g. 'PL'
  odds_api_id           text not null unique,          -- The Odds API event id
  home_team             text not null,                 -- names as The Odds API writes them
  away_team             text not null,
  kickoff_at            timestamptz not null,
  -- Polymarket link, found once by team names + kickoff time. Never guessed.
  polymarket_status     text not null default 'unchecked'
                        check (polymarket_status in ('unchecked', 'matched', 'not_found')),
  polymarket_event_id   text,
  polymarket_title      text,
  polymarket_url        text,
  polymarket_markets    jsonb,                         -- {"home": "<market id>", "draw": "...", "away": "..."}
  -- Filled in by grading after full time.
  football_data_id      integer,
  home_goals            integer,
  away_goals            integer,
  result                text check (result in ('home', 'draw', 'away')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index matches_kickoff_idx on public.matches (kickoff_at);

create table public.readings (
  id                uuid primary key default gen_random_uuid(),
  match_id          uuid not null references public.matches (id) on delete cascade,
  kind              text not null check (kind in ('day_before', 'pre_kickoff')),
  taken_at          timestamptz not null default now(),

  -- Bookies (The Odds API, UK region)
  odds_fetched_at   timestamptz not null,
  bookies           jsonb not null,                    -- [{key, title, last_update, home, draw, away}] decimal odds
  bookie_count      integer not null,
  bookie_home       numeric,                           -- consensus chance with margins removed, 0 to 1
  bookie_draw       numeric,
  bookie_away       numeric,

  -- Polymarket (through Tatum)
  poly_status       text not null check (poly_status in ('ok', 'thin_market', 'not_found')),
  poly_fetched_at   timestamptz,
  poly_volume       numeric,                           -- USD traded on the three markets so far
  poly_yes_home     numeric,                           -- raw Yes prices, 0 to 1
  poly_yes_draw     numeric,
  poly_yes_away     numeric,
  poly_home         numeric,                           -- normalised to add up to 1
  poly_draw         numeric,
  poly_away         numeric,

  -- Fetched within 5 minutes of each other?
  in_sync           boolean not null,
  -- True only when both sources are present, the market isn't thin and the fetches are in sync.
  usable            boolean not null,

  -- sha256 of the reading (see src/lib/data-job/reading.ts). This is what gets stamped on Sui.
  content_hash      text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  sui_status        text not null default 'pending' check (sui_status in ('pending', 'stamped', 'failed')),
  sui_digest        text,
  stamped_at        timestamptz,

  unique (match_id, kind)
);

create table public.job_runs (
  id                      uuid primary key default gen_random_uuid(),
  started_at              timestamptz not null default now(),
  finished_at             timestamptz,
  readings_saved          integer not null default 0,
  odds_credits_used       integer not null default 0,
  odds_credits_remaining  integer,
  log                     jsonb not null default '[]'::jsonb,
  error                   text
);

alter table public.matches enable row level security;
alter table public.readings enable row level security;
alter table public.job_runs enable row level security;

create policy "Anyone can read matches" on public.matches for select to anon, authenticated using (true);
create policy "Anyone can read readings" on public.readings for select to anon, authenticated using (true);
-- job_runs has no policy: only the data job (secret key) can see it.

revoke insert, update, delete, truncate on public.matches, public.readings, public.job_runs from anon, authenticated;
