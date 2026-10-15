'use client';

import { SUPPORTED_LOCALES } from '@bandada/i18n';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';
import { changeLocale } from '@/lib/i18n/locale';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  return (
    <div role="group" aria-label={t('common:language.switch')} className="inline-flex rounded-md border border-default bg-surface p-0.5">
      {SUPPORTED_LOCALES.map((locale) => {
        const active = i18n.language === locale;
        return (
          <button
            key={locale}
            type="button"
            lang={locale}
            aria-pressed={active}
            onClick={() => changeLocale(locale)}
            className={cn(
              'min-h-9 rounded-sm px-2.5 text-xs font-semibold uppercase transition-colors',
              'focus-visible:outline-2 focus-visible:outline-focus',
              active ? 'bg-action-primary text-action-primary-fg' : 'text-secondary hover:bg-surface-muted',
            )}
          >
            {locale}
          </button>
        );
      })}
    </div>
  );
}
