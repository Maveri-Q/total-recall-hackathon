-- Link a pick to the football-data.org fixture it was chosen from (null when typed in by hand).
-- Needed later to grade results and match odds to the right game.

alter table public.predictions add column external_match_id integer;

drop function public.create_prediction(uuid, text, text, text, timestamptz, text, integer, text, text, text);

create function public.create_prediction(
  p_id uuid,
  p_home_team text,
  p_away_team text,
  p_league text,
  p_kickoff_at timestamptz,
  p_external_match_id integer,
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
  insert into public.predictions (id, home_team, away_team, league, kickoff_at, external_match_id)
  values (p_id, p_home_team, p_away_team, p_league, p_kickoff_at, p_external_match_id);

  insert into public.prediction_versions
    (prediction_id, version, pick, confidence, reason, source, content_hash)
  values
    (p_id, 1, p_pick, p_confidence, p_reason, p_source, p_content_hash);

  return p_id;
end;
$$;

revoke execute on function public.create_prediction from public, anon;
grant execute on function public.create_prediction to authenticated;
