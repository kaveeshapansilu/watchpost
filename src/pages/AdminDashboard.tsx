import { formatStatusLabel, statusVariantFor } from '../lib/status';
import { SITE } from '../lib/site';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  CalendarClock,
  Check,
  ClipboardList,
  Copy,
  Database,
  Gauge,
  Loader2,
  LogOut,
  Megaphone,
  Pencil,
  Plus,
  Radio,
  RefreshCw,
  Send,
  Settings,
  Siren,
  Trash2,
  Wrench,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ADMIN_LOGIN_PATH, useNoIndex } from '../lib/admin';
import { useAuth } from '../hooks/useAuth';
import { Status, StatusIndicator, StatusLabel } from '../components/Status';
import { SITE_STATUS_META, type Incident, type IncidentStatus, type Maintenance, type MaintenanceTask, type SiteStatusValue, type UptimeCheck } from '../lib/types';
import { maintenancePayload, type MaintenanceTaskDraft } from '../lib/maintenance';
import { MaintenanceCard } from '../components/Cards';
import { formatDateTime, timeAgo, uptimePercent } from '../lib/time';
import { cn } from '../lib/cn';

type Tab = 'status' | 'incidents' | 'maintenance' | 'checks' | 'setup';

const TABS: { id: Tab; label: string; icon: typeof Gauge }[] = [
  { id: 'status', label: 'Website status', icon: Gauge },
  { id: 'incidents', label: 'Incidents', icon: Siren },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'checks', label: 'Monitor data', icon: Radio },
  { id: 'setup', label: 'Setup', icon: Settings },
];

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ---------- shared bits ---------- */

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm', className)}>
      {children}
    </section>
  );
}

function SectionHead({ icon: Icon, title, body }: { icon: typeof Gauge; title: string; body?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-primary/5 text-brand-primary">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <h2 className="font-bold text-slate-900">{title}</h2>
        {body && <p className="mt-0.5 text-sm text-slate-500">{body}</p>}
      </div>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button type="button" onClick={copy} className="btn-ghost !px-3 !py-1.5 text-xs" aria-label={`Copy ${label}`}>
      {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function Note({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <p
      role="status"
      className={cn(
        'rounded-lg border p-3 text-sm',
        ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800',
      )}
    >
      {children}
    </p>
  );
}

/* ---------- dashboard shell ---------- */

interface Overview {
  status: SiteStatusValue;
  statusUpdatedAt: string | null;
  activeIncidents: number;
  upcomingMaintenance: number;
  checks24h: number;
  uptime24h: number | null;
}

export default function AdminDashboard() {
  useNoIndex();
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>('status');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) nav(ADMIN_LOGIN_PATH, { replace: true });
  }, [authLoading, user, nav]);

  async function loadOverview() {
    setOverviewLoading(true);
    try {
      const [statusRes, incRes, maintRes, checksRes] = await Promise.all([
        supabase.from('site_status').select('*').eq('id', 1).maybeSingle(),
        supabase.from('incidents').select('id,status').limit(100),
        supabase.from('maintenances').select('id,status,scheduled_start').limit(100),
        supabase.from('uptime_checks').select('checked_at,is_up').order('checked_at', { ascending: false }).limit(1000),
      ]);
      const incidents = ((incRes.data as { status: string }[] | null) ?? []);
      const maints = ((maintRes.data as { status: string }[] | null) ?? []);
      const checks = ((checksRes.data as { checked_at: string; is_up: boolean }[] | null) ?? []);
      const day = checks.filter((c) => Date.now() - new Date(c.checked_at).getTime() < 24 * 3600 * 1000);
      setOverview({
        status: ((statusRes.data as { status: SiteStatusValue } | null)?.status ?? 'operational'),
        statusUpdatedAt: (statusRes.data as { updated_at: string } | null)?.updated_at ?? null,
        activeIncidents: incidents.filter((i) => i.status !== 'resolved').length,
        upcomingMaintenance: maints.filter((m) => m.status === 'scheduled' || m.status === 'in_progress').length,
        checks24h: day.length,
        uptime24h: uptimePercent(day),
      });
    } catch {
      /* overview is best-effort; tabs load their own data */
    } finally {
      setOverviewLoading(false);
    }
  }

  useEffect(() => {
    if (user && isAdmin) loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  if (authLoading)
    return (
      <Panel>
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Loading admin session…
        </p>
      </Panel>
    );
  if (!user) return null;
  if (!isAdmin) {
    return (
      <Panel className="max-w-lg mx-auto">
        <h1 className="text-xl font-bold text-slate-900">Not authorized</h1>
        <p className="mt-2 text-sm text-slate-600">
          Signed in as <strong>{user.email}</strong>, but this account does not have the <code>admin</code> role.
          Run this in Supabase SQL Editor:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-brand-dark text-white text-xs p-3">
          {`insert into public.profiles (id, email, role)\nvalues ('${user.id}', '${user.email ?? ''}', 'admin')\non conflict (id) do update set role = 'admin';`}
        </pre>
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <button className="btn-ghost" onClick={() => window.location.reload()}>
            I have been made admin, reload
          </button>
          <button
            className="btn-ghost"
            onClick={async () => {
              await signOut();
              nav(ADMIN_LOGIN_PATH);
            }}
          >
            Sign out
          </button>
        </div>
      </Panel>
    );
  }

  const stats = [
    {
      label: 'Website status',
      icon: Activity,
      tab: 'status' as Tab,
      body: overview ? (
        <Status variant={overview.status === 'operational' ? 'success' : overview.status === 'maintenance' ? 'info' : 'error'}>
          <StatusIndicator />
          <StatusLabel>{SITE_STATUS_META[overview.status].short}</StatusLabel>
        </Status>
      ) : (
        <span className="text-sm text-slate-400">…</span>
      ),
      foot: overview?.statusUpdatedAt ? `Updated ${timeAgo(overview.statusUpdatedAt)}` : ' ',
    },
    {
      label: 'Active incidents',
      icon: Siren,
      tab: 'incidents' as Tab,
      body: <span className="text-2xl font-bold tabular-nums text-slate-900">{overview?.activeIncidents ?? '…'}</span>,
      foot: (overview?.activeIncidents ?? 0) === 0 ? 'All clear' : 'Need attention',
    },
    {
      label: 'Upcoming maintenance',
      icon: CalendarClock,
      tab: 'maintenance' as Tab,
      body: <span className="text-2xl font-bold tabular-nums text-slate-900">{overview?.upcomingMaintenance ?? '…'}</span>,
      foot: 'Scheduled / in progress',
    },
    {
      label: '24h uptime',
      icon: Radio,
      tab: 'checks' as Tab,
      body: (
        <span className="text-2xl font-bold tabular-nums text-slate-900">
          {overview?.uptime24h == null ? '-' : `${overview.uptime24h.toFixed(2)}%`}
        </span>
      ),
      foot: overview ? `${overview.checks24h} checks in 24h` : ' ',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div aria-hidden="true" className="h-1.5 bg-gradient-to-r from-brand-primary via-brand-accent to-brand-soft" />
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-accent">Admin console</p>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Manage {SITE.name} status</h1>
            <p className="mt-0.5 truncate text-sm text-slate-500">Signed in as {user.email}</p>
          </div>
          <div className="flex gap-2 sm:ml-auto">
            <button className="btn-ghost !px-3" onClick={loadOverview} aria-label="Refresh overview">
              <RefreshCw className={cn('size-4', overviewLoading && 'animate-spin')} aria-hidden />
            </button>
            <button
              className="btn-ghost"
              onClick={async () => {
                await signOut();
                nav('/');
              }}
            >
              <LogOut className="size-4" aria-hidden />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Overview">
        {stats.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setTab(s.tab)}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-primary/40 hover:shadow"
          >
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <s.icon className="size-3.5" aria-hidden />
              {s.label}
            </span>
            <span className="mt-2 block min-h-[2rem]">{s.body}</span>
            <span className="mt-1 block truncate text-[11px] text-slate-400">{s.foot}</span>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Admin sections" className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition',
              tab === t.id
                ? 'border-brand-primary bg-brand-primary text-white shadow'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
            )}
          >
            <t.icon className="size-4" aria-hidden />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'status' && <StatusEditor onSaved={loadOverview} />}
      {tab === 'incidents' && <IncidentManager onChanged={loadOverview} />}
      {tab === 'maintenance' && <MaintenanceManager onChanged={loadOverview} />}
      {tab === 'checks' && <ChecksViewer />}
      {tab === 'setup' && <SetupPanel />}
    </div>
  );
}

/* ---------------- Website status ---------------- */

function StatusEditor({ onSaved }: { onSaved: () => void }) {
  const [status, setStatus] = useState<SiteStatusValue>('operational');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('site_status').select('*').eq('id', 1).maybeSingle();
      if (!error && data) {
        setStatus((data as { status: SiteStatusValue }).status);
        setMessage((data as { message: string | null }).message ?? '');
        setUpdatedAt((data as { updated_at: string }).updated_at);
      }
      setLoading(false);
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNote(null);
    const { error } = await supabase
      .from('site_status')
      .upsert({ id: 1, status, message: message.trim() || null, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    setSaving(false);
    if (error) setNote({ ok: false, text: `Failed: ${error.message}` });
    else {
      setNote({ ok: true, text: 'Published. The public page reflects this immediately.' });
      setUpdatedAt(new Date().toISOString());
      onSaved();
    }
  }

  if (loading)
    return (
      <Panel>
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Loading current status…
        </p>
      </Panel>
    );

  return (
    <Panel>
      <form onSubmit={save} className="space-y-4">
        <SectionHead
          icon={Megaphone}
          title="Overall website status"
          body="Drives the public hero headline. Use maintenance only while planned work is active."
        />
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm">
          <span className="text-slate-500">Live preview:</span>
          <Status variant={status === 'operational' ? 'success' : status === 'maintenance' ? 'info' : 'error'}>
            <StatusIndicator />
            <StatusLabel>{SITE_STATUS_META[status].label}</StatusLabel>
          </Status>
          {updatedAt && <span className="ml-auto text-xs text-slate-400">Last changed {timeAgo(updatedAt)}</span>}
        </div>
        <div>
          <label className="label" htmlFor="site-status">Status</label>
          <select id="site-status" className="input" value={status} onChange={(e) => setStatus(e.target.value as SiteStatusValue)}>
            {(Object.keys(SITE_STATUS_META) as SiteStatusValue[]).map((s) => (
              <option key={s} value={s}>
                {SITE_STATUS_META[s].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="site-message">Public message (optional)</label>
          <textarea
            id="site-message"
            className="input min-h-[90px]"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. We are investigating slow loading on the homepage. The admissions portal is unaffected."
            maxLength={500}
          />
          <p className="text-xs text-slate-400 mt-1">{message.length}/500 · shown under the hero headline</p>
        </div>
        {note && <Note ok={note.ok}>{note.text}</Note>}
        <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">
          {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
          {saving ? 'Publishing…' : 'Publish status'}
        </button>
      </form>
    </Panel>
  );
}

/* ---------------- Incidents ---------------- */

function IncidentManager({ onChanged }: { onChanged: () => void }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', description: '', severity: 'minor' as Incident['severity'] });
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [updateText, setUpdateText] = useState<Record<string, string>>({});
  const [updateStatus, setUpdateStatus] = useState<Record<string, IncidentStatus>>({});

  async function load() {
    const { data, error } = await supabase.from('incidents').select('*').order('created_at', { ascending: false }).limit(50);
    if (!error) setIncidents((data as Incident[]) ?? []);
    setLoading(false);
  }
  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect -- load updates state only after the network request resolves.
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setCreating(true);
    setMsg(null);
    const { data, error } = await supabase
      .from('incidents')
      .insert({
        title: form.title.trim(),
        description: form.description.trim() || null,
        severity: form.severity,
        status: 'investigating' as IncidentStatus,
      })
      .select('*')
      .single();
    setCreating(false);
    if (error) setMsg({ ok: false, text: `Failed: ${error.message}` });
    else {
      setIncidents((prev) => [data as Incident, ...prev]);
      setForm({ title: '', description: '', severity: 'minor' });
      setMsg({ ok: true, text: 'Incident created and visible publicly.' });
      onChanged();
    }
  }

  async function setIncidentStatus(id: string, status: IncidentStatus) {
    const patch: Partial<Incident> & { updated_at: string; resolved_at?: string | null } = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === 'resolved') patch.resolved_at = new Date().toISOString();
    else patch.resolved_at = null;
    const { error } = await supabase.from('incidents').update(patch).eq('id', id);
    if (!error) {
      setIncidents((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch, status } as Incident : i)));
      onChanged();
    } else setMsg({ ok: false, text: `Failed: ${error.message}` });
  }

  async function postUpdate(id: string) {
    const text = (updateText[id] ?? '').trim();
    if (!text) return;
    const st = updateStatus[id] ?? incidents.find((i) => i.id === id)?.status ?? 'investigating';
    const { error } = await supabase.from('incident_updates').insert({ incident_id: id, message: text, status: st });
    if (error) {
      setMsg({ ok: false, text: `Failed: ${error.message}` });
      return;
    }
    await supabase.from('incidents').update({ status: st, updated_at: new Date().toISOString(), ...(st === 'resolved' ? { resolved_at: new Date().toISOString() } : { resolved_at: null }) }).eq('id', id);
    setUpdateText((p) => ({ ...p, [id]: '' }));
    setMsg({ ok: true, text: 'Update posted.' });
    load();
    onChanged();
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this incident and all its updates? This cannot be undone.')) return;
    const { error } = await supabase.from('incidents').delete().eq('id', id);
    if (!error) {
      setIncidents((prev) => prev.filter((i) => i.id !== id));
      onChanged();
    } else setMsg({ ok: false, text: `Failed: ${error.message}` });
  }

  return (
    <div className="space-y-4">
      <Panel>
        <form onSubmit={create} className="space-y-4">
          <SectionHead icon={Plus} title="Report an incident" body="Goes live on the public page instantly." />
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <div>
              <label className="label" htmlFor="inc-title">Title</label>
              <input id="inc-title" className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Homepage intermittently timing out" maxLength={140} />
            </div>
            <div>
              <label className="label" htmlFor="inc-sev">Impact</label>
              <select id="inc-sev" className="input" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as Incident['severity'] })}>
                <option value="minor">Minor</option>
                <option value="major">Major</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="inc-desc">Description</label>
            <textarea id="inc-desc" className="input min-h-[70px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What is affected, who is impacted, workaround if any…" />
          </div>
          <button className="btn-primary w-full sm:w-auto" disabled={creating}>
            {creating ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
            {creating ? 'Publishing…' : 'Publish incident'}
          </button>
          {msg && <Note ok={msg.ok}>{msg.text}</Note>}
        </form>
      </Panel>

      {loading ? (
        <Panel>
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Loading incidents…
          </p>
        </Panel>
      ) : incidents.length === 0 ? (
        <Panel>
          <p className="text-sm text-slate-500">No incidents yet. Published incidents appear here and publicly.</p>
        </Panel>
      ) : (
        incidents.map((i) => (
          <Panel key={i.id}>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="min-w-0 flex-1 basis-full sm:basis-auto text-slate-900">{i.title}</strong>
                <Status variant={statusVariantFor(i.status)}>
                  <StatusIndicator />
                  <StatusLabel>{formatStatusLabel(i.status)}</StatusLabel>
                </Status>
                <span className="text-xs text-slate-400">{timeAgo(i.created_at)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs font-medium text-slate-500" htmlFor={`st-${i.id}`}>Status</label>
                <select id={`st-${i.id}`} className="input w-full sm:!w-auto text-sm" value={i.status} onChange={(e) => setIncidentStatus(i.id, e.target.value as IncidentStatus)}>
                  <option value="investigating">Investigating</option>
                  <option value="identified">Identified</option>
                  <option value="monitoring">Monitoring</option>
                  <option value="resolved">Resolved</option>
                </select>
                <span className="text-xs text-slate-500">Impact: {i.severity}</span>
                <button type="button" className="ml-auto inline-flex items-center gap-1 text-xs text-red-700 underline underline-offset-4" onClick={() => remove(i.id)}>
                  <Trash2 className="size-3.5" aria-hidden /> Delete
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-[160px_1fr_auto] sm:items-start">
                <select
                  aria-label={`Update status for ${i.title}`}
                  className="input text-sm"
                  value={updateStatus[i.id] ?? i.status}
                  onChange={(e) => setUpdateStatus((p) => ({ ...p, [i.id]: e.target.value as IncidentStatus }))}
                >
                  <option value="investigating">Investigating</option>
                  <option value="identified">Identified</option>
                  <option value="monitoring">Monitoring</option>
                  <option value="resolved">Resolved</option>
                </select>
                <input
                  aria-label={`Update message for ${i.title}`}
                  className="input text-sm"
                  placeholder="Post a public update… e.g. Fix deployed, monitoring recovery"
                  value={updateText[i.id] ?? ''}
                  onChange={(e) => setUpdateText((p) => ({ ...p, [i.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') postUpdate(i.id);
                  }}
                />
                <button type="button" className="btn-gold w-full sm:w-auto whitespace-nowrap" onClick={() => postUpdate(i.id)}>
                  <Send className="size-4" aria-hidden /> Post update
                </button>
              </div>
            </div>
          </Panel>
        ))
      )}
    </div>
  );
}

/* ---------------- Maintenance ---------------- */

function MaintenanceManager({ onChanged }: { onChanged: () => void }) {
  const [items, setItems] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({ title: '', description: '', start: '', end: '' });
  const [tasks, setTasks] = useState<MaintenanceTaskDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{ id: string; updatedAt: string } | null>(null);
  const [itemMsg, setItemMsg] = useState<{ maintenanceId: string; ok: boolean; text: string } | null>(null);

  function clearForm() {
    setEditing(null);
    setForm({ title: '', description: '', start: '', end: '' });
    setTasks([]);
  }

  function edit(m: Maintenance) {
    setEditing({ id: m.id, updatedAt: m.updated_at });
    setForm({ title: m.title, description: m.description ?? '', start: toLocalInput(m.scheduled_start), end: toLocalInput(m.scheduled_end) });
    setTasks([...m.tasks].sort((a, b) => a.sort_order - b.sort_order).map((task) => ({
      id: task.id, savedId: task.id, title: task.title, details: task.details ?? '',
      start: task.scheduled_start ? toLocalInput(task.scheduled_start) : '',
      end: task.scheduled_end ? toLocalInput(task.scheduled_end) : '',
    })));
    setMsg(null);
    document.getElementById('m-title')?.focus();
    document.getElementById('maintenance-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function toggleTask(task: MaintenanceTask) {
    if (busy) return;
    setBusy(true);
    setItemMsg(null);
    try {
      const { error } = await supabase.rpc('set_maintenance_task_completed', {
        p_task_id: task.id, p_completed: !task.completed_at,
      });
      if (error) throw new Error(error.message);
      await load();
      setItemMsg({ maintenanceId: task.maintenance_id, ok: true, text: task.completed_at ? 'Item reopened.' : 'Item marked completed.' });
    } catch (error) {
      setItemMsg({ maintenanceId: task.maintenance_id, ok: false, text: error instanceof Error ? error.message : 'Could not update this item.' });
    } finally {
      setBusy(false);
    }
  }

  function updateTask(id: string, patch: Partial<MaintenanceTaskDraft>) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, ...patch } : task));
  }

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from('maintenances').select('*, tasks:maintenance_tasks(*)').order('scheduled_start', { ascending: false }).limit(50);
    if (error) setMsg({ ok: false, text: `Could not load maintenance: ${error.message}` });
    else setItems((data as Maintenance[]) ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const payload = maintenancePayload(form, tasks);
      const { error } = editing
        ? await supabase.rpc('update_maintenance', { ...payload, p_id: editing.id, p_expected_updated_at: editing.updatedAt })
        : await supabase.rpc('schedule_maintenance', payload);
      if (error) throw new Error(error.message);
      setMsg({ ok: true, text: editing ? 'Maintenance updated and visible publicly.' : 'Maintenance scheduled and visible publicly.' });
      clearForm();
      load();
      onChanged();
    } catch (error) {
      setMsg({ ok: false, text: error instanceof Error ? error.message : 'Could not schedule maintenance. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: Maintenance['status']) {
    const { error } = await supabase.from('maintenances').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (!error) {
      load();
      onChanged();
    } else setMsg({ ok: false, text: `Failed: ${error.message}` });
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this maintenance window?')) return;
    const { error } = await supabase.from('maintenances').delete().eq('id', id);
    if (!error) {
      load();
      onChanged();
    } else setMsg({ ok: false, text: `Failed: ${error.message}` });
  }

  return (
    <div className="space-y-4">
      <Panel>
        <form id="maintenance-form" onSubmit={create} className="space-y-4 scroll-mt-24">
          <SectionHead icon={CalendarClock} title={editing ? 'Edit maintenance' : 'Schedule maintenance'} body={editing ? 'Update the published plan, including its items and times. Changes appear publicly when you save. Existing item completion is preserved.' : 'Group related work under one main title. Visitors see the full plan on the Maintenance page.'} />
          <fieldset disabled={busy} className="min-w-0 space-y-4">
            <div>
              <label className="label" htmlFor="m-title">Main title</label>
              <input id="m-title" className="input" required minLength={3} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Phase 1: Website Enhancements and AI Optimization" maxLength={140} />
            </div>
            <div>
              <label className="label" htmlFor="m-desc">Overview for visitors (optional)</label>
              <textarea id="m-desc" className="input min-h-[70px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What will happen, expected impact, alternative contact…" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="m-start">Overall start (local time)</label>
                <input id="m-start" type="datetime-local" className="input" required value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="m-end">Overall end (local time)</label>
                <input id="m-end" type="datetime-local" className="input" required min={form.start || undefined} value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
              </div>
            </div>
            <div className="space-y-3 border-t border-slate-200 pt-4">
              <div>
                <h3 className="font-semibold text-slate-900">Maintenance items</h3>
                <p className="mt-1 text-sm text-slate-500">Add a title and visitor details for each update. Leave item times blank to use the overall window.</p>
              </div>
              {tasks.map((task, index) => (
                <fieldset key={task.id} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <legend className="px-1 text-sm font-semibold text-brand-primary">Item {index + 1}</legend>
                  <div>
                    <label className="label" htmlFor={`task-title-${task.id}`}>Title</label>
                    <input id={`task-title-${task.id}`} className="input" required minLength={3} maxLength={140} value={task.title} onChange={(e) => updateTask(task.id, { title: e.target.value })} placeholder="e.g. Homepage Hero Slider Update" />
                  </div>
                  <div>
                    <label className="label" htmlFor={`task-details-${task.id}`}>Details for visitors</label>
                    <textarea id={`task-details-${task.id}`} className="input min-h-[100px]" value={task.details} onChange={(e) => updateTask(task.id, { details: e.target.value })} placeholder="Explain what will change and how it affects visitors…" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor={`task-start-${task.id}`}>Start (local time, optional)</label>
                      <input id={`task-start-${task.id}`} type="datetime-local" className="input min-w-0" min={form.start || undefined} max={form.end || undefined} value={task.start} onChange={(e) => updateTask(task.id, { start: e.target.value })} />
                    </div>
                    <div>
                      <label className="label" htmlFor={`task-end-${task.id}`}>End (local time, optional)</label>
                      <input id={`task-end-${task.id}`} type="datetime-local" className="input min-w-0" min={task.start || form.start || undefined} max={form.end || undefined} value={task.end} onChange={(e) => updateTask(task.id, { end: e.target.value })} />
                    </div>
                  </div>
                  <button type="button" className="inline-flex items-center gap-1 text-sm text-red-700 underline underline-offset-4" aria-label={`Remove item ${index + 1}`} onClick={() => setTasks((current) => current.filter((item) => item.id !== task.id))}>
                    <Trash2 className="size-3.5" aria-hidden /> Remove item
                  </button>
                </fieldset>
              ))}
              <button type="button" className="btn-ghost" onClick={() => setTasks((current) => [...current, { id: crypto.randomUUID(), title: '', details: '', start: '', end: '' }])}>
                <Plus className="size-4" aria-hidden /> Add item
              </button>
            </div>
          </fieldset>
          <button className="btn-primary w-full sm:w-auto" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CalendarClock className="size-4" aria-hidden />}
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Schedule maintenance'}
          </button>
          {editing && <button type="button" disabled={busy} className="btn-ghost w-full sm:ml-2 sm:w-auto" onClick={() => { clearForm(); setMsg(null); }}>Cancel editing</button>}
          {msg && <Note ok={msg.ok}>{msg.text}</Note>}
        </form>
      </Panel>

      {loading ? (
        <Panel>
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Loading…
          </p>
        </Panel>
      ) : items.length === 0 ? (
        <Panel>
          <p className="text-sm text-slate-500">No maintenance windows yet.</p>
        </Panel>
      ) : (
        items.map((m) => (
          <Panel key={m.id} className="!p-4 sm:!p-5">
            <MaintenanceCard m={m} onTaskCompletion={toggleTask} disabled={busy || Boolean(editing)} />
            {itemMsg?.maintenanceId === m.id && <div className="mt-3"><Note ok={itemMsg.ok}>{itemMsg.text}</Note></div>}
            <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
              <button type="button" disabled={busy || Boolean(editing)} className="btn-ghost disabled:opacity-50" onClick={() => edit(m)} aria-label={`Edit ${m.title}`}>
                <Pencil className="size-3.5" aria-hidden /> Edit
              </button>
              <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
                <select disabled={busy || Boolean(editing)} aria-label={`Status for ${m.title}`} className="input w-full sm:!w-auto text-sm" value={m.status} onChange={(e) => setStatus(m.id, e.target.value as Maintenance['status'])}>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button type="button" disabled={busy || Boolean(editing)} className="inline-flex items-center gap-1 text-xs text-red-700 underline underline-offset-4 disabled:opacity-50" onClick={() => remove(m.id)}>
                  <Trash2 className="size-3.5" aria-hidden /> Delete
                </button>
              </div>
            </div>
          </Panel>
        ))
      )}
    </div>
  );
}

/* ---------------- Checks ---------------- */

function ChecksViewer() {
  const [checks, setChecks] = useState<UptimeCheck[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('uptime_checks').select('*').order('checked_at', { ascending: false }).limit(100);
      setChecks((data as UptimeCheck[]) ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading)
    return (
      <Panel>
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Loading monitor data…
        </p>
      </Panel>
    );
  if (checks.length === 0)
    return (
      <Panel>
        <SectionHead icon={Radio} title="No checks recorded yet" />
        <p className="mt-2 text-sm text-slate-600">
          Deploy <code>supabase/functions/monitor</code> and schedule it (see the Setup tab). Each run inserts one row
          into <code>uptime_checks</code>; this table will then fill automatically.
        </p>
      </Panel>
    );

  const up = checks.filter((c) => c.is_up).length;
  const latencies = checks.map((c) => c.response_time_ms).filter((v): v is number => v != null);
  const avg = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null;

  return (
    <Panel>
      <SectionHead
        icon={Activity}
        title={`Latest ${checks.length} automated checks`}
        body={`${((100 * up) / checks.length).toFixed(2)}% up in this window${avg != null ? ` · avg ${avg} ms` : ''} · newest first`}
      />
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[560px] text-xs sm:text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2 font-semibold text-slate-500">Checked at</th>
              <th className="px-3 py-2 font-semibold text-slate-500">Result</th>
              <th className="px-3 py-2 font-semibold text-slate-500">HTTP</th>
              <th className="px-3 py-2 font-semibold text-slate-500">Latency</th>
              <th className="px-3 py-2 font-semibold text-slate-500">Error</th>
            </tr>
          </thead>
          <tbody>
            {checks.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(c.checked_at)}</td>
                <td className="px-3 py-2">
                  <Status variant={c.is_up ? 'success' : 'error'}>
                    <StatusIndicator />
                    <StatusLabel>{c.is_up ? 'UP' : 'DOWN'}</StatusLabel>
                  </Status>
                </td>
                <td className="px-3 py-2 tabular-nums">{c.status_code ?? '-'}</td>
                <td className="px-3 py-2 tabular-nums">{c.response_time_ms != null ? `${c.response_time_ms} ms` : '-'}</td>
                <td className="px-3 py-2 text-slate-500 max-w-[260px] truncate" title={c.error ?? ''}>{c.error ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* ---------------- Setup ---------------- */

const PROMOTE_SQL = `insert into public.profiles (id, email, role)\nvalues ('<auth-user-uuid>', 'admin@example.com', 'admin')\non conflict (id) do update set role = 'admin';`;

const DEPLOY_SH = `# deploy (Supabase CLI)\nsupabase functions deploy monitor --no-verify-jwt\nsupabase secrets set --env-file supabase/.env.monitor.local\n\n# then add a cron schedule every 2 minutes for:\n#   https://<project-ref>.supabase.co/functions/v1/monitor`;

function SetupPanel() {
  const [exampleTime] = useState(() => toLocalInput(new Date(Date.now() + 3600e3).toISOString()));
  const steps = [
    {
      icon: Database,
      title: '1 · Database is the source of truth',
      body: 'Run supabase/schema.sql once in Supabase → SQL Editor. It creates site_status, incidents, incident_updates, maintenances, maintenance_tasks, uptime_checks, profiles plus RLS policies (public read, admin-only write).',
    },
    {
      icon: Radio,
      title: '2 · Automated uptime monitor',
      body: 'Deploy supabase/functions/monitor/index.ts as a Supabase Edge Function and schedule it every 1–5 minutes. Each authorized run checks your configured website and records its availability. See docs/DEPLOYMENT.md to configure the monitor secret and scheduler.',
      code: DEPLOY_SH,
      codeLabel: 'Deploy commands',
    },
    {
      icon: ClipboardList,
      title: '3 · Admin accounts',
      body: 'Create users in Supabase → Authentication → Users, then promote them:',
      code: PROMOTE_SQL,
      codeLabel: 'Promote SQL',
    },
  ];
  return (
    <div className="space-y-4">
      {steps.map((s) => (
        <Panel key={s.title}>
          <div className="flex flex-wrap items-center gap-2">
            <SectionHead icon={s.icon} title={s.title} />
          </div>
          <p className="mt-2 text-sm text-slate-600">{s.body}</p>
          {s.code && (
            <div className="mt-3">
              <div className="mb-1.5 flex justify-end">
                <CopyButton text={s.code} label={s.codeLabel} />
              </div>
              <pre className="overflow-x-auto rounded-xl bg-brand-dark text-white text-xs p-3 sm:p-4">{s.code}</pre>
            </div>
          )}
        </Panel>
      ))}
      <Panel>
        <SectionHead icon={Settings} title="4 · Local time helper" body="Maintenance times are stored as UTC and rendered in each visitor's timezone." />
        <p className="mt-2 font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 break-all">
          {exampleTime} (example: +1h)
        </p>
      </Panel>
    </div>
  );
}
