import { formatStatusLabel, statusVariantFor } from '../lib/status';
import { Check } from 'lucide-react';
import type { Incident, IncidentUpdate, Maintenance, MaintenanceTask } from '../lib/types';
import { formatDateTime, timeAgo } from '../lib/time';
import { Status, StatusIndicator, StatusLabel } from './Status';

const shell = 'rounded-xl border border-slate-200 bg-white p-5';

export function IncidentCard({
  incident,
  updates,
}: {
  incident: Incident;
  updates: IncidentUpdate[];
  expanded?: boolean;
}) {
  return (
    <article className={shell} aria-labelledby={`incident-${incident.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Status variant={statusVariantFor(incident.status)}>
          <StatusIndicator />
          <StatusLabel>{formatStatusLabel(incident.status)}</StatusLabel>
        </Status>
        <Status variant={statusVariantFor(incident.severity)}>
          <StatusIndicator />
          <StatusLabel>{formatStatusLabel(incident.severity)} impact</StatusLabel>
        </Status>
        <span className="ml-auto text-xs text-slate-500">
          Opened {formatDateTime(incident.created_at)} ({timeAgo(incident.created_at)})
        </span>
      </div>
      <h3 id={`incident-${incident.id}`} className="mt-2 font-semibold text-slate-900">
        {incident.title}
      </h3>
      {incident.description && <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{incident.description}</p>}
      {incident.resolved_at && (
        <p className="mt-1 text-xs text-emerald-700 font-medium">Resolved {formatDateTime(incident.resolved_at)}</p>
      )}

      {updates.length > 0 && (
        <ol className="mt-4 space-y-3 border-l-2 border-slate-200 pl-4">
          {updates.map((u) => (
            <li key={u.id}>
              <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">
                {formatStatusLabel(u.status)} · {formatDateTime(u.created_at)}
              </p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{u.message}</p>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

export function MaintenanceCard({ m, onTaskCompletion, disabled = false }: {
  m: Maintenance;
  onTaskCompletion?: (task: MaintenanceTask) => void;
  disabled?: boolean;
}) {
  const tasks = [...(m.tasks ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const completed = tasks.filter((task) => task.completed_at).length;
  return (
    <article className={shell} aria-labelledby={`maint-${m.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Status variant={statusVariantFor(m.status)}>
          <StatusIndicator />
          <StatusLabel>{formatStatusLabel(m.status)}</StatusLabel>
        </Status>
        {tasks.length > 0 && <span className="ml-auto text-xs font-medium text-slate-500">{completed} of {tasks.length} completed</span>}
      </div>
      <h3 id={`maint-${m.id}`} className="mt-3 text-lg font-bold leading-snug text-brand-primary break-words">
        {m.title}
      </h3>
      <dl className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-2 text-sm">
        <div><dt className="text-xs font-medium text-slate-500">Starts</dt><dd className="mt-1 text-slate-800"><time dateTime={m.scheduled_start}>{formatDateTime(m.scheduled_start)}</time></dd></div>
        <div><dt className="text-xs font-medium text-slate-500">Ends</dt><dd className="mt-1 text-slate-800"><time dateTime={m.scheduled_end}>{formatDateTime(m.scheduled_end)}</time></dd></div>
      </dl>
      {m.description && <p className="mt-4 text-sm leading-relaxed text-slate-600 whitespace-pre-wrap break-words">{m.description}</p>}
      {tasks.length > 0 && (
        <ol className="mt-5 space-y-4 border-t border-slate-200 pt-5" aria-label="Maintenance items">
          {tasks.map((t, index) => (
            <li key={t.id} className="flex gap-3">
              <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary/5 text-xs font-bold text-brand-primary">{index + 1}</span>
              <div className="min-w-0 flex-1 pt-0.5">
                <h4 className="text-sm font-semibold text-slate-900 break-words">
                  {t.title}
                  {t.completed_at && (
                    <span className="ml-1.5 inline-block align-text-bottom text-emerald-600" role="img" aria-label="Completed" title="Completed">
                      <Check className="size-4" strokeWidth={3} aria-hidden="true" />
                    </span>
                  )}
                </h4>
                {t.details && <p className="mt-1.5 text-sm leading-relaxed text-slate-600 whitespace-pre-wrap break-words">{t.details}</p>}
                {t.scheduled_start && t.scheduled_end ? (
                  <dl className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                    <div><dt className="font-medium">Starts</dt><dd><time dateTime={t.scheduled_start}>{formatDateTime(t.scheduled_start)}</time></dd></div>
                    <div><dt className="font-medium">Ends</dt><dd><time dateTime={t.scheduled_end}>{formatDateTime(t.scheduled_end)}</time></dd></div>
                  </dl>
                ) : <p className="mt-2 text-xs text-slate-500">During the overall maintenance window</p>}
                {t.completed_at && <p className="mt-2 text-xs text-emerald-700">Completed <time dateTime={t.completed_at}>{formatDateTime(t.completed_at)}</time></p>}
                {onTaskCompletion && (
                  <button type="button" disabled={disabled} className="btn-ghost mt-3 !px-3 !py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => onTaskCompletion(t)} aria-label={`${t.completed_at ? 'Reopen' : 'Mark completed'}: ${t.title}`}>
                    {t.completed_at ? 'Reopen item' : 'Mark completed'}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className={`${shell} text-sm`}>
      <p className="font-medium text-slate-800 flex items-center gap-2">
        <span aria-hidden="true" className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs">
          ✓
        </span>
        {title}
      </p>
      <p className="mt-1 text-slate-500">{body}</p>
    </div>
  );
}
