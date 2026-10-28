import { SITE } from '../lib/site';
import { usePublicStatus } from '../hooks/usePublicStatus';
import { EmptyState, MaintenanceCard } from '../components/Cards';

export default function MaintenancePage() {
  const data = usePublicStatus(60000);

  return (
    <div className="space-y-6">
      <div className="text-center pt-2 pb-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Maintenance</h1>
        <p className="mt-2 text-sm text-slate-500">Planned work on {SITE.name}, with details for each update.</p>
        <p className="mt-1 text-xs text-slate-400">All times are shown in your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}).</p>
      </div>

      {data.error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          <p>We couldn’t load the maintenance schedule. Please try again.</p>
          <button type="button" className="mt-2 underline underline-offset-4" onClick={data.refresh}>Retry</button>
        </div>
      ) : data.loading ? (
        <div className="rounded-xl border border-slate-200 p-5 animate-pulse" role="status" aria-label="Loading maintenance">
          <div className="h-4 w-1/3 rounded bg-slate-200" />
        </div>
      ) : (
        <>
          <section aria-labelledby="upcoming" className="space-y-3">
            <h2 id="upcoming" className="text-sm font-semibold text-slate-900">
              Upcoming & in progress
            </h2>
            {data.upcomingMaintenance.length === 0 ? (
              <EmptyState title="No maintenance scheduled" body="There is no planned maintenance right now." />
            ) : (
              data.upcomingMaintenance.map((m) => <MaintenanceCard key={m.id} m={m} />)
            )}
          </section>

          <section aria-labelledby="past" className="space-y-3">
            <h2 id="past" className="text-sm font-semibold text-slate-900">
              Recent maintenance
            </h2>
            {data.pastMaintenance.length === 0 ? (
              <EmptyState title="No recent maintenance" body="Completed maintenance windows will appear here." />
            ) : (
              data.pastMaintenance.map((m) => <MaintenanceCard key={m.id} m={m} />)
            )}
          </section>
        </>
      )}
    </div>
  );
}
