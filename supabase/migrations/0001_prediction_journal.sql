-- Prediction journal: one row per match pick, plus a version row for every save.
-- Versions are never edited or deleted. Each one gets its own Sui stamp later.

create table public.predictions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  home_team   text not null check (char_length(home_team) between 2 and 60),
  away_team   text not null check (char_length(away_team) between 2 and 60),
  league      text not null check (char_length(league) between 2 and 60),
  kickoff_at  timestamptz not null,
  -- 'app' = saved in this app before kickoff. 'imported' = from the Google Sheet, never locked onchain.
  origin      text not null default 'app' check (origin in ('app', 'imported')),
  created_at  timestamptz not null default now(),
  check (lower(home_team) <> lower(away_team))
);

create index predictions_user_kickoff_idx on public.predictions (user_id, kickoff_at desc);

create table public.prediction_versions (
  id             uuid primary key default gen_random_uuid(),
  prediction_id  uuid not null references public.predictions (id) on delete cascade,
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  version        integer not null check (version >= 1),
  pick           text not null check (pick in ('home', 'draw', 'away')),
  confidence     integer not null check (confidence between 1 and 100),
  reason         text not null check (char_length(reason) between 3 and 280),
  source         text check (source is null or char_length(source) between 1 and 120),
  -- sha256 of the version's content (see src/lib/commitment.ts). This is what goes onchain.
  content_hash   text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  created_at     timestamptz not null default now(),
  sui_status     text not null default 'pending'
                 check (sui_status in ('pending', 'stamped', 'failed', 'not_applicable')),
  sui_digest     text,
  sui_error      text,
  stamped_at     timestamptz,
  unique (prediction_id, version)
);

-- Lock rule, enforced by the database so no code path can skip it:
-- app picks can't get a new version once kickoff has passed, and versions must count up by one.
create function public.check_prediction_version()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  p public.predictions%rowtype;
  latest integer;
begin
  select * into p from public.predictions where id = new.prediction_id;
  if not found then
    raise exception 'prediction_not_found';
  end if;
  if new.user_id <> p.user_id then
    raise exception 'prediction_wrong_owner';
  end if;
  if p.origin = 'app' and now() >= p.kickoff_at then
    raise exception 'prediction_locked';
  end if;

  select coalesce(max(version), 0) into latest
  from public.prediction_versions where prediction_id = new.prediction_id;
  if new.version <> latest + 1 then
    raise exception 'prediction_version_conflict';
  end if;

  if p.origin = 'imported' then
    new.sui_status := 'not_applicable';
  end if;
  return new;
end;
$$;

create trigger prediction_versions_check
  before insert on public.prediction_versions
  for each row execute function public.check_prediction_version();

-- Creates a pick and its first version in one go, so a failed lock check leaves nothing behind.
create function public.create_prediction(
  p_id uuid,
  p_home_team text,
  p_away_team text,
  p_league text,
  p_kickoff_at timestamptz,
  p_pick text,
  p_confidence integer,
  p_reason text,
  p_source text,
  p_content_hash text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.predictions (id, home_team, away_team, league, kickoff_at)
  values (p_id, p_home_team, p_away_team, p_league, p_kickoff_at);

  insert into public.prediction_versions
    (prediction_id, version, pick, confidence, reason, source, content_hash)
  values
    (p_id, 1, p_pick, p_confidence, p_reason, p_source, p_content_hash);

  return p_id;
end;
$$;

-- Row level security: people only see and add their own picks. Nobody edits or deletes from the app.
alter table public.predictions enable row level security;
alter table public.prediction_versions enable row level security;

create policy "Read own predictions" on public.predictions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Add own app predictions" on public.predictions
  for insert to authenticated with check (user_id = (select auth.uid()) and origin = 'app');

create policy "Read own versions" on public.prediction_versions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Add own versions" on public.prediction_versions
  for insert to authenticated with check (user_id = (select auth.uid()));

revoke all on public.predictions, public.prediction_versions from anon;
revoke update, delete, truncate on public.predictions, public.prediction_versions from authenticated;
revoke execute on function public.create_prediction from public, anon;
grant execute on function public.create_prediction to authenticated;
