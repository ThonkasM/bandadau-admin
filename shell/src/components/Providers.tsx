'use client';

import '@/lib/i18n/i18n';

import { type ReactNode, useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';

import { i18n } from '@/lib/i18n/i18n';
import { initLocale } from '@/lib/i18n/locale';
import { initTheme } from '@/lib/theme/theme';

import { Toaster } from './ui/Toast';

/** Idioma y tema: se resuelven en el cliente tras la hidratación (el HTML estático sale en es/light). */
export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    initLocale();
    return initTheme();
  }, []);
  return (
    <I18nextProvider i18n={i18n}>
      {children}
      <Toaster />
    </I18nextProvider>
  );
}
