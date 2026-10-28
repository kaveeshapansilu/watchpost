-- Enable pg_cron, pg_net and Vault first, and create the two Vault secrets
-- described in docs/DEPLOYMENT.md. No real credentials belong in this file.
select cron.unschedule(jobid)
from cron.job where jobname = 'watchpost-monitor';

select cron.schedule(
  'watchpost-monitor',
  '*/2 * * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'watchpost_monitor_url'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'watchpost_monitor_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 35000
    );
  $$
);

-- Optional retention:
-- select cron.schedule('watchpost-retention', '0 3 * * *',
--   $$ delete from public.uptime_checks where checked_at < now() - interval '90 days'; $$);
