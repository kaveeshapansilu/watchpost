import type { Incident, Maintenance, SiteStatusRow } from '../lib/types';
import ReasoningText from './ReasoningText';
import StatusMark from './StatusMark';
import { Loader } from './ui/reasoning-text-utils/loader';

function resolveDisplayStatus(
  siteStatus: SiteStatusRow | null,
  activeIncidents: Incident[],
  activeMaintenance: Maintenance[],
): SiteStatusRow['status'] {
  if (siteStatus && siteStatus.status !== 'operational') return siteStatus.status;
  if (activeMaintenance.length > 0) return 'maintenance';
  if (activeIncidents.length > 0) {
    if (activeIncidents.some((i) => i.severity === 'critical')) return 'major_outage';
    if (activeIncidents.some((i) => i.severity === 'major')) return 'partial_outage';
    return 'degraded';
  }
  return siteStatus?.status ?? 'operational';
}

const HEADLINES: Record<SiteStatusRow['status'], string> = {
  operational: 'All services are online',
  degraded: 'Some services are degraded',
  partial_outage: 'Partial service outage',
  major_outage: 'Major service outage',
  maintenance: 'Scheduled maintenance in progress',
};

function formatUpdatedLocal(d: Date): string {
  return (
    'Last updated on ' +
    d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) +
    ' at ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase() +
    ' (your local time)'
  );
}

/** Centered headline block like the reference status page. */
export default function StatusHero({
  siteStatus,
  activeIncidents,
  activeMaintenance,
  lastRefresh,
  loading,
}: {
  siteStatus: SiteStatusRow | null;
  activeIncidents: Incident[];
  activeMaintenance: Maintenance[];
  lastRefresh: Date | null;
  loading: boolean;
}) {
  const hasStatus = Boolean(siteStatus || activeIncidents.length || activeMaintenance.length);
  const display = resolveDisplayStatus(siteStatus, activeIncidents, activeMaintenance);
  const updated = lastRefresh ?? (siteStatus ? new Date(siteStatus.updated_at) : null);

  return (
    <section aria-labelledby="status-heading" className="text-center pt-2 pb-8">
      {!loading && hasStatus && <StatusMark key={display} status={display} />}
      <h1 id="status-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900" role="status" aria-live="polite">
        {loading ? (
          <ReasoningText
            variant="cascade"
            interval={1800}
            className="justify-center text-center text-3xl sm:text-4xl font-bold tracking-tight text-slate-900"
            indicator={<Loader variant="ascii-line" size={26} speed={0.8} label="Checking status" />}
          />
        ) : (
          hasStatus ? HEADLINES[display] : 'Status unavailable'
        )}
      </h1>
      {!loading && <p className="mt-2 text-sm text-slate-500">{updated ? formatUpdatedLocal(updated) : 'Waiting for status information.'}</p>}
      {siteStatus?.message && <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600">{siteStatus.message}</p>}
    </section>
  );
}
