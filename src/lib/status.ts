import type { StatusVariant } from '../components/Status';

/** Map domain statuses to badge variants in one place. */
export function statusVariantFor(status: string): StatusVariant {
  switch (status) {
    case 'resolved':
    case 'completed':
      return 'success';
    case 'investigating':
    case 'critical':
      return 'error';
    case 'identified':
    case 'major':
    case 'in_progress':
      return 'warning';
    case 'monitoring':
    case 'scheduled':
      return 'info';
    default:
      return 'default';
  }
}

export function formatStatusLabel(status: string): string {
  return status
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}
