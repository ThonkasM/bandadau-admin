import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from './Button';

interface PaginationProps {
  /** Página actual (1-based) para el texto; la navegación es por cursor Relay. */
  page: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  loading?: boolean;
}

export function Pagination({ page, hasPrev, hasNext, onPrev, onNext, loading }: PaginationProps) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('shell:pagination.label')} className="flex items-center justify-between gap-3 border-t border-default px-4 py-3">
      <p className="text-sm text-muted" aria-live="polite">
        {t('shell:pagination.page', { page })}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={onPrev} disabled={!hasPrev || loading}>
          <ChevronLeft aria-hidden className="size-4 rtl:rotate-180" />
          {t('common:actions.previous')}
        </Button>
        <Button variant="secondary" size="sm" onClick={onNext} disabled={!hasNext || loading}>
          {t('common:actions.next')}
          <ChevronRight aria-hidden className="size-4 rtl:rotate-180" />
        </Button>
      </div>
    </nav>
  );
}
