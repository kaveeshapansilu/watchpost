import { formatStatusLabel, statusVariantFor } from '../lib/status';
import { useState } from 'react';
import { ChevronDown, CircleAlert } from 'lucide-react';
import { cn } from '../lib/cn';
import { Status, StatusIndicator, StatusLabel } from './Status';
import type { Incident, IncidentUpdate } from '../lib/types';
import { timeAgo } from '../lib/time';

function utcTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
}

function utcDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

interface TimelineEvent {
  message: string;
  status: string;
  time: string;
}

/**
 * Incident card with a collapsible vertical status timeline,
 * styled after the reference timeline pattern (original implementation,
 * dependency-free. no Radix/shadcn required). Driven entirely by real
 * incident + incident_updates rows; never fabricated.
 */
export default function IncidentTimeline({
  incident,
  updates,
  defaultOpen = true,
}: {
  incident: Incident;
  updates: IncidentUpdate[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const sorted = [...updates].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const events: TimelineEvent[] =
    sorted.length > 0
      ? sorted.map((u) => ({ message: u.message, status: u.status, time: utcTime(u.created_at) }))
      : [
          {
            message: incident.description || 'Incident reported. Updates will be posted here.',
            status: incident.status,
            time: utcTime(incident.created_at),
          },
        ];

  const latest = sorted[sorted.length - 1];

  return (
    <article
      aria-labelledby={`incident-${incident.id}`}
      className="w-full rounded-lg border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-200 pb-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden="true" />
            <div className="min-w-0">
              <h3 id={`incident-${incident.id}`} className="text-sm leading-snug font-semibold text-slate-900">
                {incident.title}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Started {utcDate(incident.created_at)} · {utcTime(incident.created_at)} · {incident.severity} impact
              </p>
            </div>
          </div>
          <Status variant={statusVariantFor(incident.status)} className="shrink-0">
            <StatusIndicator />
            <StatusLabel>{formatStatusLabel(incident.status)}</StatusLabel>
          </Status>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={`timeline-${incident.id}`}
          className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-slate-900"
        >
          View incident timeline
          <ChevronDown
            className={cn('size-3 transition-transform duration-200', open && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
      </div>

      {open && (
        <div id={`timeline-${incident.id}`} className="p-4 sm:p-5 py-3">
          <div className="relative">
            <div aria-hidden="true" className="absolute top-0 bottom-0 left-[7px] w-px bg-slate-200" />
            <ol className="space-y-4">
              {events.map((event, i) => (
                <li className="relative flex gap-3" key={`${event.time}-${i}`}>
                  <div className="relative z-10 mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white">
                    <div
                      aria-hidden="true"
                      className={cn(
                        'size-1.5 rounded-full',
                        i === events.length - 1 ? 'bg-emerald-500' : 'bg-slate-400',
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Status variant={statusVariantFor(event.status)}>
                        <StatusIndicator />
                        <StatusLabel>{formatStatusLabel(event.status)}</StatusLabel>
                      </Status>
                      <span className="text-xs text-slate-500">{event.time}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-600 whitespace-pre-wrap">{event.message}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <hr className="mt-4 mb-3 border-slate-200" />
          <p className="text-xs text-slate-500">
            {incident.status === 'resolved' && incident.resolved_at ? (
              <>
                Resolved {utcDate(incident.resolved_at)} · {utcTime(incident.resolved_at)}.
              </>
            ) : latest ? (
              <>
                Latest update {timeAgo(latest.created_at)}. Further updates will be posted here.
              </>
            ) : (
              <>Updates will be posted here as the team responds.</>
            )}
          </p>
        </div>
      )}
    </article>
  );
}
