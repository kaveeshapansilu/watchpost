import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '../lib/cn';

export type DeltaType = 'increase' | 'decrease' | 'neutral';
export type BadgeDeltaVariant = 'outline' | 'solid' | 'solidOutline' | 'complex';

const base = 'inline-flex items-center gap-x-1 rounded-md px-2 py-1 text-xs font-semibold whitespace-nowrap';

// Light-only equivalents of the reference Tremor compound variants
// (this site ships a fixed light theme, so dark: branches are omitted).
const tones: Record<Exclude<BadgeDeltaVariant, 'complex'>, Record<DeltaType, string>> = {
  outline: {
    increase: 'text-emerald-700 ring-1 ring-inset ring-slate-200',
    decrease: 'text-red-700 ring-1 ring-inset ring-slate-200',
    neutral: 'text-slate-600 ring-1 ring-inset ring-slate-200',
  },
  solid: {
    increase: 'bg-emerald-100 text-emerald-800',
    decrease: 'bg-red-100 text-red-800',
    neutral: 'bg-slate-200/60 text-slate-600',
  },
  solidOutline: {
    increase: 'bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-600/10',
    decrease: 'bg-red-100 text-red-800 ring-1 ring-inset ring-red-600/10',
    neutral: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-400/10',
  },
};

const valueText: Record<DeltaType, string> = {
  increase: 'text-emerald-700',
  decrease: 'text-red-700',
  neutral: 'text-slate-600',
};

const chipBg: Record<DeltaType, string> = {
  increase: 'bg-emerald-100',
  decrease: 'bg-red-100',
  neutral: 'bg-slate-100',
};

function DeltaIcon({ deltaType }: { deltaType: DeltaType }) {
  const cls = '-ml-0.5 size-4';
  if (deltaType === 'increase') return <TrendingUp className={cls} aria-hidden />;
  if (deltaType === 'decrease') return <TrendingDown className={cls} aria-hidden />;
  return <Minus className={cls} aria-hidden />;
}

interface BadgeDeltaProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: string | number;
  variant?: BadgeDeltaVariant;
  deltaType?: DeltaType;
}

/**
 * Tremor-style delta badge (lucide icons stand in for @remixicon/react,
 * hardcoded radius/scale instead of tremor theme tokens. no extra deps).
 * `value` is the displayed text, e.g. "+0.42%".
 */
export function BadgeDelta({
  className,
  variant = 'outline',
  deltaType = 'neutral',
  value,
  ...props
}: BadgeDeltaProps) {
  if (variant === 'complex') {
    return (
      <span className={cn('inline-flex items-center space-x-2.5 rounded-lg bg-slate-50 py-1 pl-2.5 pr-1 ring-1 ring-inset ring-slate-200', className)} {...props}>
        <span className={cn('text-xs font-semibold', valueText[deltaType])}>{value}</span>
        <span className={cn('rounded-md px-2 py-1', chipBg[deltaType])}>
          <DeltaIcon deltaType={deltaType} />
        </span>
      </span>
    );
  }

  return (
    <span className={cn(base, tones[variant][deltaType], className)} {...props}>
      <DeltaIcon deltaType={deltaType} />
      {value}
    </span>
  );
}

export default BadgeDelta;
