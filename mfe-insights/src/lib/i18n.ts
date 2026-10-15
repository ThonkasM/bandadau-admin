import { DEFAULT_LOCALE, type Locale, resources as sharedResources, SUPPORTED_LOCALES } from '@bandada/i18n';
import i18next, { type i18n as I18n } from 'i18next';
import ICU from 'i18next-icu';

import enInsights from '../locales/en/insights.json';
import esInsights from '../locales/es/insights.json';

export const NAMESPACES = ['insights', 'common', 'enums', 'errors'] as const;

const resources = {
  es: { ...sharedResources.es, insights: esInsights },
  en: { ...sharedResources.en, insights: enInsights },
};

/** Instancia propia de i18next por elemento (no toca la global del shell). Catálogos empaquetados. */
export function createI18n(locale: Locale = DEFAULT_LOCALE): I18n {
  const instance = i18next.createInstance();
  void instance.use(ICU).init({
    resources,
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES],
    ns: [...NAMESPACES],
    defaultNS: 'insights',
    interpolation: { escapeValue: false },
    returnNull: false,
    initAsync: false,
  });
  return instance;
}
