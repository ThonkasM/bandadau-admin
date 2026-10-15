import { formatDate, formatNumber, type Locale } from '@bandada/i18n';
import { useId } from 'react';

export interface ChartSeries {
  name: string;
  label: string;
  points: Array<{ date: string; value: number }>;
}

// Clases completas (Tailwind no resuelve nombres armados dinámicamente). Colores: tokens `color.chart.series.1..8`.
const STROKES = ['stroke-chart-1', 'stroke-chart-2', 'stroke-chart-3', 'stroke-chart-4', 'stroke-chart-5', 'stroke-chart-6', 'stroke-chart-7', 'stroke-chart-8'] as const;
const FILLS = ['fill-chart-1', 'fill-chart-2', 'fill-chart-3', 'fill-chart-4', 'fill-chart-5', 'fill-chart-6', 'fill-chart-7', 'fill-chart-8'] as const;
const SWATCHES = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5', 'bg-chart-6', 'bg-chart-7', 'bg-chart-8'] as const;

const W = 640;
const H = 240;
const PAD = { top: 12, right: 16, bottom: 28, left: 44 };

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  const n = value / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

/** Gráfico de líneas simple en SVG con tokens de color; incluye tabla oculta equivalente para lectores de pantalla. */
export function LineChart({ series, locale, title }: { series: ChartSeries[]; locale: Locale; title: string }) {
  const titleId = useId();
  const dates = Array.from(new Set(series.flatMap((s) => s.points.map((p) => p.date)))).sort();
  const maxValue = niceMax(Math.max(0, ...series.flatMap((s) => s.points.map((p) => p.value))));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (dates.length <= 1 ? innerW / 2 : (i / (dates.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / maxValue) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxValue);
  const labelIdx = Array.from(new Set([0, Math.floor((dates.length - 1) / 2), dates.length - 1])).filter((i) => i >= 0);

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={titleId} className="h-auto w-full">
        <title id={titleId}>{title}</title>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} className="stroke-chart-grid" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(tick) + 4} textAnchor="end" className="fill-chart-axis text-xs">
              {formatNumber(Math.round(tick), locale)}
            </text>
          </g>
        ))}
        {labelIdx.map((i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === dates.length - 1 ? 'end' : 'middle'} className="fill-chart-axis text-xs">
            {formatDate(`${dates[i]}T12:00:00Z`, locale, 'short')}
          </text>
        ))}
        {series.map((s, si) => {
          const byDate = new Map(s.points.map((p) => [p.date, p.value]));
          const pts = dates.flatMap((d, i) => (byDate.has(d) ? [{ d, i, v: byDate.get(d) ?? 0 }] : []));
          const tip = (d: string, v: number) => `${s.label}: ${formatNumber(v, locale)} (${formatDate(`${d}T12:00:00Z`, locale, 'short')})`;
          return (
            <g key={s.name}>
              <polyline
                fill="none"
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                className={STROKES[si % STROKES.length]}
                points={pts.map((p) => `${x(p.i)},${y(p.v)}`).join(' ')}
              />
              {pts.map((p) => (
                <circle key={p.d} cx={x(p.i)} cy={y(p.v)} r={3} className={FILLS[si % FILLS.length]}>
                  <title>{tip(p.d, p.v)}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s, si) => (
          <span key={s.name} className="inline-flex items-center gap-1.5 text-xs text-secondary">
            <span aria-hidden className={`size-2.5 rounded-full ${SWATCHES[si % SWATCHES.length]}`} />
            {s.label}
          </span>
        ))}
      </figcaption>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">{dates.length}</th>
            {series.map((s) => (
              <th key={s.name} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dates.map((d) => (
            <tr key={d}>
              <th scope="row">{d}</th>
              {series.map((s) => (
                <td key={s.name}>{s.points.find((p) => p.date === d)?.value ?? ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
