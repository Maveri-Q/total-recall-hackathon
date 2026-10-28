-- GitHub's own hourly timer runs late or skips (on 27 Oct it ran about every 4 to 5 hours).
-- Supabase's scheduler (pg_cron) is on time, so every hour at :17 it asks GitHub to start the
-- data job (pg_net makes the web request). GitHub's timer stays on as a backup. Two runs can't
-- overlap (the workflow's concurrency group) and readings are never saved twice.
--
-- Needs a GitHub token saved in Supabase Vault under the name 'github_dispatch_token'.
-- The token is never written in this file or in the repo.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- A private schema, so the function can't be called through the public API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.trigger_data_job()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text;
begin
  select decrypted_secret into token
  from vault.decrypted_secrets
  where name = 'github_dispatch_token';

  if token is null then
    raise warning 'No github_dispatch_token in Vault. The data job was not started.';
    return;
  end if;

  perform net.http_post(
    url     := 'https://api.github.com/repos/Maveri-Q/total-recall-hackathon/actions/workflows/data-job.yml/dispatches',
    body    := '{"ref": "main"}'::jsonb,
    headers := jsonb_build_object(
      'Authorization',        'Bearer ' || token,
      'Accept',               'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28',
      'User-Agent',           'total-recall-data-job',
      'Content-Type',         'application/json'
    )
  );
end;
$$;

revoke all on function private.trigger_data_job() from public, anon, authenticated;

-- Every hour at :17 (UTC). Running this file again replaces the schedule instead of adding a second one.
select cron.schedule('trigger-data-job', '17 * * * *', 'select private.trigger_data_job()');
