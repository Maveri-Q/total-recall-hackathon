-- "Your call": a one-tap call on a game from the Coming up page.
-- Calls reuse the predictions tables: one prediction per user per game, a new version for each change
-- before kickoff. Each version is stamped on Sui. Confidence is optional now.

-- Link a call to the game it was made on (a row of the data job's matches table).
alter table public.predictions add column match_id uuid references public.matches (id) on delete set null;
create unique index predictions_one_call_per_game on public.predictions (user_id, match_id) where match_id is not null;

alter table public.prediction_versions alter column confidence drop not null;
alter table public.prediction_versions drop constraint if exists prediction_versions_confidence_check;
alter table public.prediction_versions
  add constraint prediction_versions_confidence_check check (confidence is null or confidence between 1 and 100);

-- Same lock rule as before, plus a daily limit: every call is a Sui transaction the app pays for.
create or replace function public.check_prediction_version()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  p public.predictions%rowtype;
  latest integer;
  today integer;
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
  select count(*) into today
  from public.prediction_versions where user_id = new.user_id and created_at > now() - interval '24 hours';
  if p.origin = 'app' and today >= 30 then
    raise exception 'daily_limit';
  end if;
  if p.origin = 'imported' then
    new.sui_status := 'not_applicable';
  end if;
  return new;
end;
$$;

-- Makes the first call on a game. Teams and kickoff are copied from the game itself, never from the browser.
create function public.create_call(p_id uuid, p_match_id uuid, p_league text, p_pick text, p_content_hash text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  m public.matches%rowtype;
begin
  select * into m from public.matches where id = p_match_id;
  if not found then
    raise exception 'match_not_found';
  end if;
  insert into public.predictions (id, home_team, away_team, league, kickoff_at, match_id)
  values (p_id, m.home_team, m.away_team, p_league, m.kickoff_at, p_match_id);
  insert into public.prediction_versions (prediction_id, version, pick, content_hash)
  values (p_id, 1, p_pick, p_content_hash);
  return p_id;
end;
$$;

revoke execute on function public.create_call from public, anon;
grant execute on function public.create_call to authenticated;
