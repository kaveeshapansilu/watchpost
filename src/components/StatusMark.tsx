import { Check, TriangleAlert, Wrench } from 'lucide-react';
import type { SiteStatusRow } from '../lib/types';
import { cn } from '../lib/cn';

type Status = SiteStatusRow['status'];

const CONFIG: Record<Status, { wrapper: string; ring: string; Icon: typeof Check }> = {
  operational: {
    wrapper: 'bg-emerald-100 text-emerald-600',
    ring: 'border-emerald-400',
    Icon: Check,
  },
  degraded: {
    wrapper: 'bg-amber-100 text-amber-600',
    ring: 'border-amber-400',
    Icon: TriangleAlert,
  },
  partial_outage: {
    wrapper: 'bg-orange-100 text-orange-600',
    ring: 'border-orange-400',
    Icon: TriangleAlert,
  },
  major_outage: {
    wrapper: 'bg-red-100 text-red-600',
    ring: 'border-red-400',
    Icon: TriangleAlert,
  },
  maintenance: {
    wrapper: 'bg-brand-primary/10 text-brand-primary',
    ring: 'border-brand-primary/30',
    Icon: Wrench,
  },
};

/**
 * Animated status mark shown above the headline.
 * Entrance plays once on mount (no repeats); parent keys by
 * status so it replays only when the status itself changes.
 */
export default function StatusMark({ status }: { status: Status }) {
  const { wrapper, ring, Icon } = CONFIG[status];

  return (
    <div aria-hidden="true" className="relative mx-auto mb-3 h-16 w-16 sm:h-20 sm:w-20">
      <span className={cn('status-ring-once absolute inset-0 rounded-full border-2', ring)} />
      <span className={cn('status-mark-pop flex h-full w-full items-center justify-center rounded-full', wrapper)}>
        <Icon className="h-8 w-8 sm:h-10 sm:w-10" strokeWidth={2.5} />
      </span>
    </div>
  );
}
