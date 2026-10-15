'use client';

import '@/lib/i18n/i18n';
import './globals.css';

import { useTranslation } from 'react-i18next';

/** Último recurso (falla el layout raíz): debe renderizar su propio <html>. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useTranslation();
  return (
    <html lang="es">
      <body>
        <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
          <h1 className="font-display text-2xl font-bold text-primary">{t('shell:states.crashTitle')}</h1>
          <p className="max-w-md text-sm text-muted">{t('shell:states.crashBody')}</p>
          <button
            type="button"
            onClick={reset}
            className="min-h-11 rounded-md bg-action-primary px-4 text-sm font-semibold text-action-primary-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {t('common:actions.retry')}
          </button>
        </div>
      </body>
    </html>
  );
}
