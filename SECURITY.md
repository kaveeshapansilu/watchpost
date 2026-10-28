# Security

## Deployment boundaries

One installation has one monitored website and one Supabase project. Do not use a shared database to host unrelated customers: tenant isolation is not implemented.

Public visitors may read status content and uptime history. Authenticated users can read their own profile; only administrators can write status, incidents, maintenance, or checks. New profiles default to viewer and cannot promote themselves. Admin status must be granted through a trusted database administrator.

The monitor runs with server-side Supabase credentials and requires a separate secret for every invocation. The frontend must contain only a publishable or legacy anon key. Build-time validation rejects privileged frontend keys. Frontend login throttling is a convenience, not an anti-abuse boundary; configure Supabase Auth limits appropriately.

Disable public signup, use strong administrator passwords, keep dependencies updated, and restrict access to database backups and scheduler settings. Do not put private internal details in incident or maintenance text because these records are public.

## Reporting

Report vulnerabilities through [GitHub private vulnerability reporting](https://github.com/kaveeshapansilu/watchpost/security/advisories/new), rather than a public issue. Do not include live keys or personal data in reports.

## Supported version

Security fixes target the latest release. Review the changelog and database migrations when upgrading.
