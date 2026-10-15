import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-muted text-secondary border-default',
  success: 'bg-feedback-success text-feedback-success-fg border-feedback-success-border',
  warning: 'bg-feedback-warning text-feedback-warning-fg border-feedback-warning-border',
  danger: 'bg-feedback-danger text-feedback-danger-fg border-feedback-danger-border',
  info: 'bg-feedback-info text-feedback-info-fg border-feedback-info-border',
};

export function Badge({ tone = 'neutral', className, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap', TONES[tone], className)} {...rest} />;
}
