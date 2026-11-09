'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';
import { useViewMode, type ViewMode } from '@/lib/view-mode';

const MODES: readonly ViewMode[] = ['summary', 'detail'];

/** Interruptor Resumen (gerencial) / Detalle. La elección se recuerda y la comparten el dashboard e Insights. */
export function ViewModeToggle() {
  const { t } = useTranslation();
  const mode = useViewMode((s) => s.mode);
  const setMode = useViewMode((s) => s.setMode);
  const hydrate = useViewMode((s) => s.hydrate);
  useEffect(() => hydrate(), [hydrate]);

  return (
    <div role="group" aria-label={t('shell:view.label')} className="inline-flex rounded-md border border-default bg-surface-muted p-0.5">
      {MODES.map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          onClick={() => setMode(value)}
          className={cn(
            'min-h-10 rounded px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-focus md:min-h-8',
            mode === value ? 'bg-action-primary text-action-primary-fg' : 'text-secondary hover:text-primary',
          )}
        >
          {t(`shell:view.${value}`)}
        </button>
      ))}
    </div>
  );
}
