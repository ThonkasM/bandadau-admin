import { formatNumber, type Locale } from '@bandada/i18n';
import { useId } from 'react';

export interface BarSeries {
  name: string;
  label: string;
  /** Índice de color del token `chart-N` (1–8), estable entre vistas. */
  color: number;
}

export interface BarCategory {
  label: string;
  values: number[];
}

const FILLS = ['fill-chart-1', 'fill-chart-2', 'fill-chart-3', 'fill-chart-4', 'fill-chart-5', 'fill-chart-6', 'fill-chart-7', 'fill-chart-8'] as const;
const SWATCHES = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5', 'bg-chart-6', 'bg-chart-7', 'bg-chart-8'] as const;

const W = 640;
const LABEL_W = 190;
const PAD = { top: 8, right: 44, bottom: 22 };
const BAR_H = 14;
const GAP = 4;
const ROW_GAP = 14;

const short = (s: string, max = 30) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

/** Barras horizontales agrupadas en SVG con tokens de color; incluye tabla oculta equivalente para lectores de pantalla. */
export function BarChart({
  categories,
  series,
  locale,
  title,
  format,
}: {
  categories: BarCategory[];
  series: BarSeries[];
  locale: Locale;
  title: string;
  format?: (value: number) => string;
}) {
  const fmt = format ?? ((v: number) => formatNumber(v, locale));
  const titleId = useId();
  const tip = (category: string, serie: string, v: number) => `${category} · ${serie}: ${fmt(v)}`;
  const max = Math.max(1, ...categories.flatMap((c) => c.values));
  const rowH = series.length * BAR_H + (series.length - 1) * GAP;
  const H = PAD.top + categories.length * (rowH + ROW_GAP) + PAD.bottom;
  const innerW = W - LABEL_W - PAD.right;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={titleId} className="h-auto w-full">
        <title id={titleId}>{title}</title>
        {ticks.map((tick) => {
          const x = LABEL_W + (tick / max) * innerW;
          return (
            <g key={tick}>
              <line x1={x} x2={x} y1={PAD.top} y2={H - PAD.bottom} className="stroke-chart-grid" strokeWidth={1} />
              <text x={x} y={H - 6} textAnchor="middle" className="fill-chart-axis text-xs">
                {fmt(Math.round(tick))}
              </text>
            </g>
          );
        })}
        {categories.map((c, ci) => {
          const y0 = PAD.top + ci * (rowH + ROW_GAP) + ROW_GAP / 2;
          return (
            <g key={c.label}>
              <text x={LABEL_W - 8} y={y0 + rowH / 2 + 4} textAnchor="end" className="fill-chart-axis text-xs">
                {short(c.label)}
                <title>{c.label}</title>
              </text>
              {series.map((s, si) => {
                const v = c.values[si] ?? 0;
                const w = (v / max) * innerW;
                const y = y0 + si * (BAR_H + GAP);
                return (
                  <g key={s.name}>
                    <rect x={LABEL_W} y={y} width={Math.max(w, v > 0 ? 2 : 0)} height={BAR_H} rx={3} className={FILLS[(s.color - 1) % FILLS.length]}>
                      <title>{tip(c.label, s.label, v)}</title>
                    </rect>
                    <text x={LABEL_W + w + 6} y={y + BAR_H - 3} className="fill-chart-axis text-xs font-semibold">
                      {fmt(v)}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      {series.length > 1 ? (
        <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {series.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1.5 text-xs text-secondary">
              <span aria-hidden className={`size-2.5 rounded-full ${SWATCHES[(s.color - 1) % SWATCHES.length]}`} />
              {s.label}
            </span>
          ))}
        </figcaption>
      ) : null}
      <div className="sr-only">
        <table>
          <caption>{title}</caption>
          <thead>
            <tr>
              <th scope="col" />
              {series.map((s) => (
                <th key={s.name} scope="col">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.label}>
                <th scope="row">{c.label}</th>
                {series.map((s, si) => (
                  <td key={s.name}>{c.values[si] ?? 0}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
