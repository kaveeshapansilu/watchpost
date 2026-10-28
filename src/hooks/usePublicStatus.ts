import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Incident, IncidentUpdate, Maintenance, SiteStatusRow, UptimeCheck } from '../lib/types';
import { groupMaintenances } from '../lib/maintenance';

export interface PublicStatusData {
  siteStatus: SiteStatusRow | null;
  activeIncidents: Incident[];
  recentIncidents: Incident[];
  incidentUpdates: Record<string, IncidentUpdate[]>;
  upcomingMaintenance: Maintenance[];
  activeMaintenance: Maintenance[];
  pastMaintenance: Maintenance[];
  checks: UptimeCheck[];
  loading: boolean;
  error: string | null;
  lastRefresh: Date | null;
  refresh: () => void;
  configured: boolean;
}

// 30-day bar needs one row per check, not just the newest 500.
// At a 2-min cron: ~720 rows/day, ~5k/week, ~21.6k/30d.
// Fetch up to MAX_CHECKS paginated (1000/page, PostgREST-safe)
// and stop early once we are past 30 days. Select only the 2 columns the
// bar chart needs to keep the payload small.
const MAX_CHECKS = 25000;
const CHECKS_PAGE_SIZE = 1000;
const CHECKS_WINDOW_DAYS = 30;

export function usePublicStatus(autoRefreshMs = 60000): PublicStatusData {
  const [siteStatus, setSiteStatus] = useState<SiteStatusRow | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [incidentUpdates, setIncidentUpdates] = useState<Record<string, IncidentUpdate[]>>({});
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [checks, setChecks] = useState<UptimeCheck[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(isSupabaseConfigured ? null : 'Supabase is not configured yet.');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    async function fetchChecks(): Promise<UptimeCheck[]> {
      const all: UptimeCheck[] = [];
      const cutoff = Date.now() - CHECKS_WINDOW_DAYS * 24 * 3600 * 1000;
      for (let from = 0; from < MAX_CHECKS; from += CHECKS_PAGE_SIZE) {
        const to = from + CHECKS_PAGE_SIZE - 1;
        const { data, error } = await supabase
          .from('uptime_checks')
          .select('checked_at,is_up')
          .order('checked_at', { ascending: false })
          .range(from, to);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...(data as UptimeCheck[]));
        if (data.length < CHECKS_PAGE_SIZE) break;
        const oldest = new Date(data[data.length - 1].checked_at as string).getTime();
        if (Number.isFinite(oldest) && oldest < cutoff) break;
      }
      return all;
    }

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [statusRes, incidentsRes, updatesRes, maintRes, checks] = await Promise.all([
          supabase.from('site_status').select('*').eq('id', 1).maybeSingle(),
          supabase.from('incidents').select('*').order('created_at', { ascending: false }).limit(50),
          supabase.from('incident_updates').select('*').order('created_at', { ascending: false }).limit(200),
          supabase.from('maintenances').select('*, tasks:maintenance_tasks(*)').order('scheduled_start', { ascending: false }).limit(50),
          fetchChecks(),
        ]);

        if (cancelled) return;

        const firstError = statusRes.error ?? incidentsRes.error ?? updatesRes.error ?? maintRes.error;
        if (firstError) throw firstError;

        setSiteStatus((statusRes.data as SiteStatusRow | null) ?? null);
        setIncidents((incidentsRes.data as Incident[]) ?? []);

        const grouped: Record<string, IncidentUpdate[]> = {};
        for (const u of ((updatesRes.data as IncidentUpdate[]) ?? [])) {
          (grouped[u.incident_id] ||= []).push(u);
        }
        setIncidentUpdates(grouped);

        const maintenances = ((maintRes.data as Maintenance[]) ?? []).map((m) => ({
          ...m,
          tasks: (m.tasks ?? []).sort((a, b) => a.sort_order - b.sort_order),
        }));
        setMaintenances(maintenances);
        setChecks(checks ?? []);
        setLastRefresh(new Date());
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load status data. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    if (autoRefreshMs <= 0) return;
    const id = window.setInterval(() => setTick((t) => t + 1), autoRefreshMs);
    return () => window.clearInterval(id);
  }, [autoRefreshMs]);

  const activeIncidents = incidents.filter((i) => i.status !== 'resolved');
  const recentIncidents = incidents.slice(0, 20);
  const activeMaintenance = maintenances.filter((m) => m.status === 'in_progress');
  const { upcomingMaintenance, pastMaintenance } = groupMaintenances(maintenances);

  return {
    siteStatus,
    activeIncidents,
    recentIncidents,
    incidentUpdates,
    upcomingMaintenance,
    activeMaintenance,
    pastMaintenance,
    checks,
    loading,
    error,
    lastRefresh,
    refresh,
    configured: isSupabaseConfigured,
  };
}
