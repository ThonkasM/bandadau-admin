import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (value: boolean) => void; label: ReactNode; disabled?: boolean }) {
  return (
    <label className={cn('inline-flex min-h-11 items-center gap-3 text-sm text-primary md:min-h-8', disabled && 'opacity-70')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full border border-strong transition-colors',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
          checked ? 'bg-action-primary' : 'bg-surface-muted',
        )}
      >
        <span
          aria-hidden
          className={cn('absolute top-0.5 size-4.5 rounded-full bg-surface shadow-sm transition-all motion-reduce:transition-none', checked ? 'start-5.5' : 'start-0.5')}
        />
      </button>
      {label}
    </label>
  );
}
