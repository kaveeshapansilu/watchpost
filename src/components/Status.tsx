import { createContext, useContext } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export type StatusVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

const pillClasses: Record<StatusVariant, string> = {
  default: 'border-slate-200 bg-slate-100 text-slate-500',
  success: 'border-green-500/20 bg-green-500/10 text-green-700',
  error: 'border-red-500/20 bg-red-500/10 text-red-700',
  warning: 'border-orange-500/20 bg-orange-500/10 text-orange-700',
  info: 'border-blue-500/20 bg-blue-500/10 text-blue-700',
};

const dotClasses: Record<StatusVariant, string> = {
  default: 'bg-slate-400',
  success: 'bg-green-600',
  error: 'bg-red-600',
  warning: 'bg-orange-600',
  info: 'bg-blue-600',
};

const VariantContext = createContext<StatusVariant>('default');

interface StatusProps extends HTMLAttributes<HTMLDivElement> {
  variant?: StatusVariant;
}

/**
 * Pill badge with a pinging indicator dot (light-only adaptation of the
 * reference status pattern). No CVA/Radix needed. variant styling comes
 * from the maps above, and the dot color flows to StatusIndicator via
 * context (Tailwind v3 can't do the original `**:data-[slot=...]` selectors).
 */
export function Status({ variant = 'default', className, ...props }: StatusProps) {
  return (
    <VariantContext.Provider value={variant}>
      <div
        data-slot="status"
        data-variant={variant}
        className={cn(
          'inline-flex w-fit shrink-0 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
          pillClasses[variant],
          className,
        )}
        {...props}
      />
    </VariantContext.Provider>
  );
}

export function StatusIndicator({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const variant = useContext(VariantContext);
  return (
    <div
      data-slot="status-indicator"
      className={cn(
        'relative flex size-2 shrink-0 rounded-full',
        dotClasses[variant],
        'before:absolute before:inset-0 before:animate-ping before:rounded-full before:bg-inherit',
        'after:absolute after:inset-[2px] after:rounded-full after:bg-inherit',
        className,
      )}
      {...props}
    />
  );
}

export function StatusLabel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="status-label" className={cn('leading-none', className)} {...props} />;
}

export default Status;
