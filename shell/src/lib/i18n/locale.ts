import { isLocale, type Locale, LOCALE_STORAGE_KEY, resolveLocale } from '@bandada/i18n';

import { syncPreferences } from '../auth/preferences';
import { env } from '../env';
import { currentLocale, i18n } from './i18n';

function readStored(): string | null {
  try {
    return localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function apply(locale: Locale) {
  if (currentLocale() !== locale) void i18n.changeLanguage(locale);
  document.documentElement.lang = locale;
}

/** i18n.md §2: idioma de la cuenta, luego el guardado en el dispositivo, luego el del navegador, luego es. */
export function initLocale(userLocale?: string | null) {
  const stored = readStored();
  const locale = resolveLocale({
    userLocale,
    storedLocale: stored ?? (userLocale ? null : env.defaultLocale === 'en' ? 'en' : null),
    systemLocales: typeof navigator === 'undefined' ? [] : navigator.languages,
  });
  apply(locale);
}

/** Cambio explícito del usuario: se guarda en el dispositivo y, con sesión, en la cuenta. */
export function changeLocale(locale: Locale) {
  if (!isLocale(locale)) return;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* almacenamiento no disponible */
  }
  apply(locale);
  void syncPreferences({ locale });
}

/** La preferencia de la cuenta gana al iniciar sesión (se guarda localmente, no se reenvía). */
export function adoptAccountLocale(locale: string | null | undefined) {
  if (!isLocale(locale)) return;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* almacenamiento no disponible */
  }
  apply(locale);
}
