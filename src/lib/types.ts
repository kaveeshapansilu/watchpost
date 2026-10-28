export type SiteStatusValue =
  | 'operational'
  | 'degraded'
  | 'partial_outage'
  | 'major_outage'
  | 'maintenance';

export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';
export type IncidentSeverity = 'minor' | 'major' | 'critical';
export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface SiteStatusRow {
  id: number;
  status: SiteStatusValue;
  message: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface Incident {
  id: string;
  title: string;
  description: string | null;
  status: IncidentStatus;
  severity: IncidentSeverity;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  created_by: string | null;
}

export interface IncidentUpdate {
  id: string;
  incident_id: string;
  message: string;
  status: IncidentStatus;
  created_at: string;
  created_by: string | null;
}

export interface MaintenanceTask {
  id: string;
  maintenance_id: string;
  title: string;
  details: string | null;
  completed_at: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Maintenance {
  id: string;
  title: string;
  description: string | null;
  status: MaintenanceStatus;
  scheduled_start: string;
  scheduled_end: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  tasks: MaintenanceTask[];
}

export interface UptimeCheck {
  id: number;
  checked_at: string;
  is_up: boolean;
  response_time_ms: number | null;
  status_code: number | null;
  error: string | null;
  region: string | null;
}

export interface Profile {
  id: string;
  email: string | null;
  role: 'admin' | 'viewer';
  created_at: string;
}

export const SITE_STATUS_META: Record<SiteStatusValue, { label: string; short: string }> = {
  operational: { label: 'All Systems Operational', short: 'Operational' },
  degraded: { label: 'Degraded Performance', short: 'Degraded' },
  partial_outage: { label: 'Partial Outage', short: 'Partial outage' },
  major_outage: { label: 'Major Outage', short: 'Major outage' },
  maintenance: { label: 'Under Maintenance', short: 'Maintenance' },
};
