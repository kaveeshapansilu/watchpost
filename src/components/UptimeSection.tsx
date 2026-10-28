import { SITE } from '../lib/site';
import { useState } from 'react';
import { MONITORED_SITE } from '../lib/site';
import { bucketByDay, formatDate, uptimePercent } from '../lib/time';
import type { UptimeCheck } from '../lib/types';
import { Status, StatusIndicator, StatusLabel } from './Status';
import { BadgeDelta, type DeltaType } from './BadgeDelta';

function dayState(pct: number | null, total: number): 'up' | 'down' | 'nodata' {
  if (total === 0 || pct == null) return 'nodata';
  return pct >= 99 ? 'up' : 'down';
}

const BAR: Record<string, string> = {
  up: 'bg-gradient-to-t from-emerald-600 to-emerald-400',
  down: 'bg-gradient-to-t from-red-600 to-red-400',
  nodata: 'bg-gradient-to-t from-slate-200 to-slate-100',
};

interface DaySlot {
  key: string;
  label: string;
  state: 'up' | 'down' | 'nodata';
  sub: string;
}

/** Display uptime without noisy trailing zeros: 100% stays 100%. */
function formatUptime(pct: number | null): string {
  if (pct == null) return '-';
  if (pct >= 99.995) return '100%';
  return `${pct.toFixed(2)}%`;
}
function downtimeText(pct: number | null, total: number): string {
  if (total === 0 || pct == null) return 'No data';
  if (pct >= 99) return 'Operational';
  const mins = Math.max(1, Math.round(((100 - pct) / 100) * 1440));
  return `Down for ${mins} minute${mins === 1 ? '' : 's'}`;
}

/**
 * "Current status by service" card with a 30-day daily bar,
 * in the style of the reference status page (original implementation).
 */
export default function ServiceCard({ checks, now }: { checks: Pick<UptimeCheck, 'checked_at' | 'is_up'>[]; now: number }) {
  const [tooltip, setTooltip] = useState<DaySlot | null>(null);
  // Time-based window (not count-based): correct regardless of cron interval
  // (1-min, 2-min, 5-min, 30-min all behave the same).
  const WINDOW_MS = 30 * 24 * 3600 * 1000;
  const cutoff = now - WINDOW_MS;
  const windowChecks = checks.filter((c) => new Date(c.checked_at).getTime() >= cutoff);
  const pct30 = uptimePercent(windowChecks);
  const overallUp = pct30 == null ? null : pct30 >= 99;

  // 7-day vs prior 7-day trend from real checks (for the delta badge).
  const DAY = 24 * 3600 * 1000;
  const last7 = uptimePercent(checks.filter((c) => now - new Date(c.checked_at).getTime() < 7 * DAY));
  const prev7 = uptimePercent(
    checks.filter((c) => {
      const age = now - new Date(c.checked_at).getTime();
      return age >= 7 * DAY && age < 14 * DAY;
    }),
  );
  const delta = last7 != null && prev7 != null ? last7 - prev7 : null;
  const deltaType: DeltaType = delta == null ? 'neutral' : delta > 0.005 ? 'increase' : delta < -0.005 ? 'decrease' : 'neutral';
  const deltaValue = delta == null ? '-' : `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}%`;

  const byDay = bucketByDay(windowChecks);
  const daysAsc = [...byDay.entries()].slice(0, 30).reverse();

  // Always render a fixed 30-slot strip so the bar looks complete from day one;
  // leading slots with no data render grey.
  const slots: DaySlot[] = [];
  if (daysAsc.length < 30) {
    const oldest = daysAsc.length > 0 ? new Date(daysAsc[0][0]) : new Date(now);
    for (let i = 30 - daysAsc.length; i > 0; i--) {
      const d = new Date(oldest);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      slots.push({ key: `empty-${key}`, label: formatDate(key), state: 'nodata', sub: 'No data' });
    }
  }
  for (const [day, list] of daysAsc) {
    const pct = uptimePercent(list);
    slots.push({ key: day, label: formatDate(day), state: dayState(pct, list.length), sub: downtimeText(pct, list.length) });
  }

  return (
    <section aria-labelledby="service-heading" className="rounded-xl border border-slate-200 bg-white">
      <h2 id="service-heading" className="px-5 pt-4 text-sm font-semibold text-slate-900">
        Current status by service
      </h2>

      <div className="px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
          <Status variant={overallUp == null ? 'default' : overallUp ? 'success' : 'error'}>
            <StatusIndicator />
            <StatusLabel>{overallUp == null ? 'Collecting data' : overallUp ? 'Operational' : 'Disrupted'}</StatusLabel>
          </Status>
          <span className="hidden sm:block text-slate-400" aria-hidden="true">·</span>
          <span className="hidden sm:block break-all text-slate-600">{MONITORED_SITE.displayUrl}</span>
          <span className="ml-auto flex flex-wrap items-center gap-2">
            {delta != null && (
              <BadgeDelta
                variant="solid"
                deltaType={deltaType}
                value={deltaValue}
                title="Uptime change: last 7 days vs prior 7 days"
              />
            )}
            <span className="font-medium tabular-nums text-slate-700">
              {pct30 == null ? '-' : `${formatUptime(pct30)} uptime`}
            </span>
          </span>
        </div>

        <div
          className="mt-3 flex items-end gap-[3px] sm:gap-1 overflow-hidden px-0.5 pb-1 pt-3"
          role="img"
          aria-label={checks.length === 0 ? 'No uptime data yet' : `Daily availability over the last ${slots.length} days`}
          onMouseLeave={() => {
            setTooltip(null);
          }}
        >
          {slots.map((s, i) => (
            <div
              key={s.key}
              className={`bar-cell bar-rise h-10 min-w-0 flex-1 cursor-default rounded-full ${BAR[s.state]}`}
              style={{ animationDelay: `${i * 28}ms` }}
              onMouseEnter={() => {
                setTooltip(s);
              }}
              onFocus={() => {
                setTooltip(s);
              }}
              onBlur={() => setTooltip(null)}
              tabIndex={0}
              aria-label={`${s.label}: ${s.sub}`}
            />
          ))}
        </div>
        <p className="mt-2 min-h-5 text-center text-xs text-slate-500" role="status">
          {tooltip && (
            <span key={tooltip.key} className="tooltip-swap inline-flex items-center gap-1.5">
              <span aria-hidden="true" className={`inline-block h-2 w-2 shrink-0 rounded-full ${BAR[tooltip.state]}`} />
              {tooltip.label}: {tooltip.sub}
            </span>
          )}
        </p>

        <div className="mt-2 flex justify-between text-[11px] text-slate-400" aria-hidden="true">
          <span>30 days ago</span>
          <span>20 days ago</span>
          <span>10 days ago</span>
          <span>Today</span>
        </div>

        {checks.length === 0 && (
          <p className="mt-3 rounded-lg bg-slate-50 border border-dashed border-slate-200 p-3 text-xs text-slate-500">
            Uptime statistics will be displayed here as monitoring data is collected. This information will provide a
            clear overview of {SITE.name}’s availability and reliability over time.
          </p>
        )}
      </div>
    </section>
  );
}
