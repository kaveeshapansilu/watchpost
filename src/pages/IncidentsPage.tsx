import { SITE } from '../lib/site';
import { usePublicStatus } from '../hooks/usePublicStatus';
import { EmptyState, IncidentCard } from '../components/Cards';
import IncidentTimeline from '../components/IncidentTimeline';

export default function IncidentsPage() {
  const data = usePublicStatus(60000);

  return (
    <div className="space-y-6">
      <div className="text-center pt-2 pb-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Previous incidents</h1>
        <p className="mt-2 text-sm text-slate-500">Current issues and history for {SITE.name}.</p>
      </div>

      {data.loading ? (
        <div className="rounded-xl border border-slate-200 p-5 animate-pulse" role="status" aria-label="Loading incidents">
          <div className="h-4 w-1/3 rounded bg-slate-200" />
        </div>
      ) : (
        <>
          {data.activeIncidents.length > 0 && (
            <section aria-labelledby="active" className="space-y-3">
              <h2 id="active" className="text-sm font-semibold text-slate-900">
                Active ({data.activeIncidents.length})
              </h2>
              {data.activeIncidents.map((i) => (
                <IncidentTimeline key={i.id} incident={i} updates={data.incidentUpdates[i.id] ?? []} />
              ))}
            </section>
          )}

          <section aria-labelledby="history" className="space-y-3">
            <h2 id="history" className="text-sm font-semibold text-slate-900">
              History
            </h2>
            {data.recentIncidents.filter((i) => i.status === 'resolved').length === 0 ? (
              <EmptyState title="No past incidents" body="Resolved incidents will be listed here with their updates." />
            ) : (
              data.recentIncidents
                .filter((i) => i.status === 'resolved')
                .map((i) => (
                  <IncidentCard key={i.id} incident={i} updates={(data.incidentUpdates[i.id] ?? []).slice(0, 5)} />
                ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
