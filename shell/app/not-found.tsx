'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="font-display text-2xl font-bold text-primary">{t('shell:notFound.title')}</h1>
      <p className="text-sm text-muted">{t('shell:notFound.body')}</p>
      <Link href="/" className="inline-flex min-h-11 items-center rounded-md bg-action-primary px-4 text-sm font-semibold text-action-primary-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
        {t('shell:notFound.home')}
      </Link>
    </div>
  );
}
