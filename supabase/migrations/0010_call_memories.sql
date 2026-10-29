-- Calls are remembered on Walrus too, and every Walrus write keeps a short line for the Memory page.
--
-- kind 'call'   one memory per call version (each call and each change before kickoff)
-- fan_id        for calls only: an anonymous id (a hash of the user id). Never a name or email.
-- summary       a short line for the Memory page feed, e.g. "Roma 4-2 Cagliari"

alter table public.memories drop constraint if exists memories_kind_check;
alter table public.memories
  add constraint memories_kind_check check (kind in ('reading', 'match_result', 'source_record', 'call'));

alter table public.memories add column fan_id text check (fan_id is null or fan_id ~ '^[0-9a-f]{12}$');
alter table public.memories add column summary text;

create index memories_saved_idx on public.memories (saved_at desc) where status = 'saved';
create index memories_fan_idx on public.memories (fan_id) where fan_id is not null;
