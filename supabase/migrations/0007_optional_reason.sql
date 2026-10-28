-- Picks are one tap now: the "why this pick?" box is gone. New versions save no reason.
-- Older versions keep theirs.
alter table public.prediction_versions alter column reason drop not null;
alter table public.prediction_versions drop constraint if exists prediction_versions_reason_check;
alter table public.prediction_versions
  add constraint prediction_versions_reason_check check (reason is null or char_length(reason) between 3 and 280);
