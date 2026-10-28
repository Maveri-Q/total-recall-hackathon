-- What the data job saves to Walrus Memory, and whether it got there.
-- The text is written here first (by deterministic code), then sent to Walrus. Each row keeps the
-- Walrus job id and blob id, so the app can show exactly which memories exist and where.
--
--   reading        one per stamped odds reading
--   match_result   one per graded match: both readings, the score, who was closer
--   source_record  a running record per league (and 'ALL'), a new one each time the count grows

create table public.memories (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('reading', 'match_result', 'source_record')),
  ref_key     text not null,                 -- reading id, match id, or '<league>:<matches counted>'
  namespace   text not null,                 -- Walrus Memory namespace: readings, results or records
  text        text not null,
  status      text not null default 'pending' check (status in ('pending', 'sent', 'saved', 'failed')),
  attempts    integer not null default 0,
  job_id      text,                          -- relayer job id while it's being saved
  blob_id     text,                          -- Walrus blob id once saved
  error       text,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz,
  saved_at    timestamptz,
  unique (kind, ref_key)
);

create index memories_status_idx on public.memories (status);

-- Public data only (odds, prices, results), so anyone can read it. Only the data job writes.
alter table public.memories enable row level security;
create policy "Anyone can read memories" on public.memories for select to anon, authenticated using (true);
