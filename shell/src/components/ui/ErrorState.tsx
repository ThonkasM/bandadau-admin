import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useErrorText } from '@/lib/graphql/errors';

import { Button } from './Button';

/** Estado de error de una vista de datos: mensaje por `code` + "Reintentar". */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  const errorText = useErrorText();
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-feedback-danger text-feedback-danger-fg">
        <AlertTriangle aria-hidden className="size-6" />
      </span>
      <h3 className="font-display text-md font-semibold text-primary">{t('shell:states.errorTitle')}</h3>
      <p className="max-w-md text-sm text-muted">{errorText(error)}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {t('common:actions.retry')}
        </Button>
      )}
    </div>
  );
}
