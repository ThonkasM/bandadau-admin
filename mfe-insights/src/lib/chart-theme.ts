import type { Locale } from '@bandada/i18n';
import { INTL_LOCALES } from '@bandada/i18n';

type Css = (name: string) => string;

const SERIES_COUNT = 8;

/** Lee un token `--bd-*` ya resuelto para el tema activo (las variables heredan del `data-theme` del anfitrión). */
export function tokenReader(host: Element): Css {
  const style = getComputedStyle(host);
  return (name) => style.getPropertyValue(name).trim();
}

/**
 * `config` de Vega-Lite derivado de los tokens (RN-19.8 / D13): la spec guardada no lleva colores; aquí se
 * inyectan fondo, ejes, rejilla y paleta categórica `color.chart.series.*` del tema activo.
 */
export function buildVegaConfig(css: Css): Record<string, unknown> {
  const series = Array.from({ length: SERIES_COUNT }, (_, i) => css(`--bd-color-chart-series-${i + 1}`)).filter(Boolean);
  const text = css('--bd-color-text-primary');
  const muted = css('--bd-color-text-muted');
  const grid = css('--bd-color-chart-grid');
  const axis = css('--bd-color-chart-axis');
  const font = css('--bd-font-family-body');
  const opt = <T,>(value: T | '' | undefined, key: string) => (value ? { [key]: value } : {});
  return {
    ...opt(css('--bd-color-bg-surface'), 'background'),
    ...opt(font, 'font'),
    view: { stroke: 'transparent' },
    ...(series.length > 0 ? { range: { category: series, ordinal: series }, mark: { color: series[0] } } : {}),
    axis: {
      ...opt(axis, 'domainColor'),
      ...opt(axis, 'tickColor'),
      ...opt(grid, 'gridColor'),
      ...opt(muted, 'labelColor'),
      ...opt(text, 'titleColor'),
    },
    legend: { ...opt(muted, 'labelColor'), ...opt(text, 'titleColor') },
    title: { ...opt(text, 'color'), ...opt(text, 'subtitleColor') },
  };
}

/** `formatLocale` / `timeFormatLocale` de Vega construidos con Intl (números y fechas del idioma del visor). */
export function buildLocaleDefinitions(locale: Locale) {
  const tag = INTL_LOCALES[locale];
  const nf = new Intl.NumberFormat(tag).formatToParts(1234567.5);
  const decimal = nf.find((p) => p.type === 'decimal')?.value ?? '.';
  const group = nf.find((p) => p.type === 'group')?.value ?? ',';
  const names = (opts: Intl.DateTimeFormatOptions, n: number, make: (i: number) => Date) =>
    Array.from({ length: n }, (_, i) => new Intl.DateTimeFormat(tag, { ...opts, timeZone: 'UTC' }).format(make(i)));
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return {
    formatLocale: { decimal, thousands: group, grouping: [3], currency: ['', ''] },
    timeFormatLocale: {
      dateTime: '%x, %X',
      date: locale === 'es' ? '%d/%m/%Y' : '%m/%d/%Y',
      time: '%H:%M:%S',
      periods: ['AM', 'PM'] as [string, string],
      days: names({ weekday: 'long' }, 7, (i) => new Date(Date.UTC(2023, 0, 1 + i))).map(cap),
      shortDays: names({ weekday: 'short' }, 7, (i) => new Date(Date.UTC(2023, 0, 1 + i))).map((s) => cap(s.replace('.', ''))),
      months: names({ month: 'long' }, 12, (i) => new Date(Date.UTC(2023, i, 1))).map(cap),
      shortMonths: names({ month: 'short' }, 12, (i) => new Date(Date.UTC(2023, i, 1))).map((s) => cap(s.replace('.', ''))),
    },
  };
}
