import { DEFAULT_LOCALE, type Locale, resources as sharedResources, SUPPORTED_LOCALES } from '@bandada/i18n';
import i18next from 'i18next';
import ICU from 'i18next-icu';
import { initReactI18next } from 'react-i18next';

import enAuth from '../../../locales/en/auth.json';
import enDashboard from '../../../locales/en/dashboard.json';
import enEvents from '../../../locales/en/events.json';
import enShell from '../../../locales/en/shell.json';
import enUniversities from '../../../locales/en/universities.json';
import enUsers from '../../../locales/en/users.json';
import esAuth from '../../../locales/es/auth.json';
import esDashboard from '../../../locales/es/dashboard.json';
import esEvents from '../../../locales/es/events.json';
import esShell from '../../../locales/es/shell.json';
import esUniversities from '../../../locales/es/universities.json';
import esUsers from '../../../locales/es/users.json';

export const NAMESPACES = ['shell', 'auth', 'dashboard', 'users', 'universities', 'events', 'common', 'enums', 'errors'] as const;

const resources = {
  es: {
    ...sharedResources.es,
    shell: esShell,
    auth: esAuth,
    dashboard: esDashboard,
    users: esUsers,
    universities: esUniversities,
    events: esEvents,
  },
  en: {
    ...sharedResources.en,
    shell: enShell,
    auth: enAuth,
    dashboard: enDashboard,
    users: enUsers,
    universities: enUniversities,
    events: enEvents,
  },
};

if (!i18next.isInitialized) {
  void i18next
    .use(ICU)
    .use(initReactI18next)
    .init({
      resources,
      lng: DEFAULT_LOCALE,
      fallbackLng: DEFAULT_LOCALE,
      supportedLngs: [...SUPPORTED_LOCALES],
      ns: [...NAMESPACES],
      defaultNS: 'shell',
      interpolation: { escapeValue: false },
      returnNull: false,
      initAsync: false,
      react: { useSuspense: false },
    });
}

export const i18n = i18next;

export function currentLocale(): Locale {
  return i18next.language === 'en' ? 'en' : 'es';
}
