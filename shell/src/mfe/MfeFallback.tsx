'use client';

import { PlugZap } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

import type { MfeError } from './types';

/** Fallback del MFE (microfrontends.md §5): mensaje traducido, "Reintentar" y salida a otro módulo. */
export function MfeFallback({ error, onRetry }: { error: MfeError | null; onRetry: () => void }) {
  const { t } = useTranslation();
  const code = error?.code ?? 'MFE_LOAD_FAILED';
  return (
    <div role="alert" className="rounded-lg border border-default bg-surface shadow-sm">
      <EmptyState
        icon={PlugZap}
        title={t('shell:mfe.failedTitle')}
        description={t(`shell:mfe.errors.${code}`)}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={onRetry}>{t('common:actions.retry')}</Button>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-md bg-action-secondary px-4 text-sm font-semibold text-action-secondary-fg hover:bg-action-secondary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:min-h-10"
            >
              {t('shell:mfe.goHome')}
            </Link>
          </div>
        }
      />
    </div>
  );
}
