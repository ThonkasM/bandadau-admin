'use client';

import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="font-display text-2xl font-bold text-primary">{t('shell:states.crashTitle')}</h1>
      <p className="max-w-md text-sm text-muted">{t('shell:states.crashBody')}</p>
      <Button onClick={reset}>{t('common:actions.retry')}</Button>
    </div>
  );
}
