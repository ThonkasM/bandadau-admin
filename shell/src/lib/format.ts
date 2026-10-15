import { type Locale } from '@bandada/i18n';
import { useTranslation } from 'react-i18next';

/** Fecha ISO (YYYY-MM-DD) en UTC para `DateRangeInput`. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function daysAgo(days: number, from = new Date()): Date {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

export function useLocale(): Locale {
  const { i18n } = useTranslation();
  return i18n.language === 'en' ? 'en' : 'es';
}

export function shortId(id: string): string {
  return id.slice(0, 8);
}
