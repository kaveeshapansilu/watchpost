# Deploy Watchpost

Use a separate Supabase project and static-hosting destination for each website. The repository contains no deployment credentials.

## 1. Configure the website and database

Run `npm ci` and `npm run setup`. Create a Supabase project, run `supabase/schema.sql`, create an Auth user, and promote the user as described in the README. Disable public signup and configure Supabase Auth's Site URL to your HTTPS status-page origin. Use the Auth dashboard to manage passwords and administrators; this app does not implement self-service registration or password-reset screens.

If the Auth user existed before the schema, create its profile with:

```sql
insert into public.profiles (id, email, role)
values ('YOUR_AUTH_USER_UUID', 'admin@example.com', 'admin')
on conflict (id) do update set role = 'admin';
```

The setup command generates a strong `MONITOR_SECRET` in `supabase/.env.monitor.local`. It is distinct from all Supabase API keys. Keep that file private. The frontend uses only the project's public key; the Edge Function receives its service-role key from Supabase's server environment.

## 2. Deploy the monitor

Install the Supabase CLI using its official installation instructions, authenticate, and link the new project:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
npm run monitor:env
supabase secrets set --env-file supabase/.env.monitor.local
supabase functions deploy monitor --no-verify-jwt
```

The monitor checks a dedicated Bearer secret itself. Disabling the gateway JWT check does **not** make it publicly callable: missing or incorrect secrets receive HTTP 401 before any probe or database write. Use POST, not GET. The configured target comes only from server environment settings, never a request parameter. HTTP 200–399 after redirects is considered available. The timeout defaults to 15 seconds and is limited to 1–30 seconds.

Do not add `MONITOR_SECRET` or the service-role key to frontend environment variables. No need to copy Supabase's service-role key into a local file for normal hosted deployments.

Official references: [function secrets](https://supabase.com/docs/guides/functions/secrets), [function authentication](https://supabase.com/docs/guides/functions/auth).

## 3. Schedule checks

Enable **pg_cron**, **pg_net**, and **Vault** in Supabase. In Vault, create:

- `watchpost_monitor_url`: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/monitor`
- `watchpost_monitor_secret`: the `MONITOR_SECRET` value from your private monitor environment file

Run [`supabase/schedule.sql`](../supabase/schedule.sql) in SQL Editor. It schedules one check every two minutes and replaces an existing schedule with the same name. Keep a two-minute or slower interval with the default frontend history limit. A one-minute schedule exceeds the default 25,000-check fetch cap for 30 days; increase that limit deliberately if you choose a faster schedule.

The alternative is any trusted server-side scheduler that sends a POST request to the function URL with an `Authorization: Bearer <your monitor secret>` header every two minutes. Store this secret in the scheduler's secret store, not in a public repository or browser page.

Verify the first invocation in the Edge Function logs and confirm that `public.uptime_checks` gains a row. A down website still produces a successful monitor invocation with `is_up = false`. Failed database writes return HTTP 500 and should be investigated.

Official reference: [scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions).

## 4. Build and host

```sh
npm run build
npm run preview
```

Verify the public pages and `/admin/login` locally. Deploy **only the contents of `dist/`** to an HTTPS host at a domain's root. Hosting under a subdirectory is not configured in this starter.

### Apache / cPanel

Create a subdomain such as `status.example.com` with its own document root. Enable HTTPS, then upload the complete `dist/` contents, including `.htaccess`. The generated `.htaccess` handles React routes, HTTPS redirects, cache headers, and a Content Security Policy containing your configured Supabase origin.

Do not upload the repository root, `.env`, SQL scripts, or dependency folders. If the host uses a reverse proxy, adapt the HTTPS redirect to its trusted proxy configuration to avoid redirect loops.

### Netlify

Publish `dist` after running `npm run build`. The included `_redirects` file supplies the SPA fallback. Set the two `VITE_SUPABASE_*` variables in the hosting environment if you build there. Configure HTTPS and security headers in the host's settings; Apache headers do not apply to Netlify.

### Vercel

Import the repository with the Vite framework preset, set the public Supabase environment variables, and use the included `vercel.json` route fallback. Apache headers do not apply to Vercel. The [rewrite configuration](https://vercel.com/docs/project-configuration/vercel-json) preserves existing static files before using the SPA fallback.

### Other hosts

Serve existing files directly and rewrite other routes to `index.html`. Cache hashed `/assets/` files for a year and serve `index.html` without long-lived caching. Use these headers where supported: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a CSP allowing your Supabase origin, same-origin scripts, inline styles, and your logo image origin. The Apache template is a starting point.

## Updates, backup, and retention

Back up the Supabase database before schema upgrades. New installations use the complete `schema.sql`. Existing installations apply only migrations introduced after their installed version, in filename order. The migrations included in version 1.0.0 are already incorporated into its baseline schema.

Rebuild and redeploy after source or configuration changes. Redeploy Edge Functions when their source changes. Re-upload monitor settings and update the Vault value if you rotate the monitor secret. Do not clear the secret file casually: regenerating it requires updating both the deployed function and scheduler.

Uptime rows grow continuously. Optionally schedule daily cleanup of rows older than 90 days using the commented example in `supabase/schedule.sql`. This retains more history than the public 30-day chart needs.

## Troubleshooting

- **Setup page appears:** supply both public Supabase settings, then rebuild.
- **Build rejects a key:** use a publishable or anon key; never use a privileged key.
- **Admin access denied:** verify the signed-in user's `profiles.role` is `admin`.
- **Monitor 401:** confirm the function and scheduler share the same private monitor secret and that JWT verification is disabled for this function.
- **Monitor 503:** configure its HTTPS target and a secret of at least 32 characters.
- **Pages fail on refresh:** configure the SPA fallback or include `.htaccess`.
- **No history yet:** confirm the scheduled job runs and writes `uptime_checks` rows.
- **Maintenance save fails:** ensure the database has the full baseline schema, including scheduling and editing functions.
