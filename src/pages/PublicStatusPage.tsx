import { useState } from 'react';
import { SITE } from '../lib/site';
import { Link } from 'react-router-dom';
import { usePublicStatus } from '../hooks/usePublicStatus';
import StatusHero from '../components/StatusHero';
import ServiceCard from '../components/UptimeSection';
import { EmptyState, MaintenanceCard } from '../components/Cards';
import IncidentTimeline from '../components/IncidentTimeline';

export default function PublicStatusPage() {
  const data = usePublicStatus(60000);
  const [initialTime] = useState(Date.now);

  if (!data.configured) return (
    <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 p-6 sm:p-8">
      <p className="text-sm font-semibold text-brand-primary">Welcome to Watchpost</p>
      <h1 className="mt-2 text-2xl font-bold">Set up your status page</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">Connect your own website and database to start publishing status updates.</p>
      <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm text-slate-700">
        <li>Run <code>npm run setup</code> to configure your website and branding.</li>
        <li>Follow the README to create your database and administrator account.</li>
        <li>Deploy the monitor, build the site, and upload the contents of <code>dist/</code>.</li>
      </ol>
    </section>
  );

  return (
    <div className="space-y-6">
      <StatusHero
        siteStatus={data.siteStatus}
        activeIncidents={data.activeIncidents}
        activeMaintenance={data.activeMaintenance}
        lastRefresh={data.lastRefresh}
        loading={data.loading}
      />

      {data.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert">
          <p className="font-semibold">Couldn’t load status data</p>
          <p className="mt-1 break-words">{data.error}</p>
          <button type="button" onClick={data.refresh} className="btn-ghost mt-3">
            Retry
          </button>
        </div>
      )}

      {data.loading ? (
        <div role="status" aria-label="Loading status" className="rounded-xl border border-slate-200 p-5 animate-pulse">
          <div className="h-4 w-1/3 rounded bg-slate-200" />
          <div className="mt-3 h-10 w-full rounded bg-slate-100" />
        </div>
      ) : (
        <>
          <ServiceCard checks={data.checks} now={data.lastRefresh?.getTime() ?? initialTime} />

          <section aria-labelledby="active-heading" className="space-y-3 pt-2">
            <h2 id="active-heading" className="text-sm font-semibold text-slate-900">
              Active incidents
            </h2>
            {data.activeIncidents.length === 0 ? (
              <EmptyState title="No active incidents" body={`${SITE.name} has no ongoing incidents. New incidents appear here with live updates.`} />
            ) : (
              data.activeIncidents.map((i) => (
                <IncidentTimeline key={i.id} incident={i} updates={data.incidentUpdates[i.id] ?? []} />
              ))
            )}
          </section>

          <section aria-labelledby="maint-now-heading" className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 id="maint-now-heading" className="text-sm font-semibold text-slate-900">
                Upcoming maintenance
              </h2>
              <Link to="/maintenance" className="text-sm text-slate-500 underline underline-offset-4 hover:text-slate-800">
                View all
              </Link>
            </div>
            {data.upcomingMaintenance.length === 0 ? (
              <EmptyState title="No maintenance scheduled" body={`There is no planned maintenance for ${SITE.name} right now.`} />
            ) : (
              data.upcomingMaintenance.slice(0, 3).map((m) => <MaintenanceCard key={m.id} m={m} />)
            )}
          </section>

          <p className="text-center text-xs text-slate-400">
            <Link to="/incidents" className="underline underline-offset-4 hover:text-slate-600">
              View previous incidents
            </Link>{' '}
            · Auto-refreshes every 60 seconds
          </p>


        </>
      )}
    </div>
  );
}
