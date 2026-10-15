import { type Locale, TIME_ZONE } from '@bandada/i18n';
import { useTranslation } from 'react-i18next';

/** Fecha ISO (YYYY-MM-DD) en la zona del producto (America/La_Paz) para `DateRangeInput`. */
export function isoDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function daysAgo(days: number, from = new Date()): Date {
  const d = new Date(from);
  d.setTime(d.getTime() - days * 86_400_000);
  return d;
}

export function useLocale(): Locale {
  const { i18n } = useTranslation();
  return i18n.language === 'en' ? 'en' : 'es';
}

export function shortId(id: string): string {
  return id.slice(0, 8);
}
