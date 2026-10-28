-- Grading after full time. The data job looks up each finished match on football-data.org,
-- saves the 90-minute score, then scores every reading of that match with the Brier score
-- (see src/lib/scoring.ts). Lower is better: 0 is perfect, 2 is the worst possible.

alter table public.matches
  -- What football-data.org last said about the match. Only 'finished' matches are graded.
  add column result_status text check (result_status in ('finished', 'postponed', 'cancelled')),
  add column graded_at     timestamptz;

alter table public.readings
  add column bookie_brier numeric,   -- Brier score of the bookie consensus
  add column poly_brier   numeric,   -- Brier score of Polymarket (null when there was no market)
  -- Which source was closer. Only set for usable readings, so thin or out-of-sync ones never count.
  add column closer       text check (closer in ('bookies', 'polymarket', 'tie')),
  add column graded_at    timestamptz;

create index matches_ungraded_idx on public.matches (kickoff_at) where graded_at is null;
