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

const AREAS = ['fill-chart-1/15', 'fill-chart-2/15', 'fill-chart-3/15', 'fill-chart-4/15', 'fill-chart-5/15', 'fill-chart-6/15', 'fill-chart-7/15', 'fill-chart-8/15'] as const;
const CHIPS = [
  'bg-chart-1/15 text-chart-1',
  'bg-chart-2/15 text-chart-2',
  'bg-chart-3/15 text-chart-3',
  'bg-chart-4/15 text-chart-4',
  'bg-chart-5/15 text-chart-5',
  'bg-chart-6/15 text-chart-6',
  'bg-chart-7/15 text-chart-7',
  'bg-chart-8/15 text-chart-8',
] as const;

/** Color estable por métrica: la misma serie usa el mismo color en el dashboard, en sus tarjetas y en todas las vistas. */
const METRIC_COLOR: Record<string, number> = {
  registrationsConfirmed: 0,
  postsCreated: 1,
  posts: 1,
  commentsCreated: 2,
  comments: 2,
  activeUsers: 3,
  newUsers: 4,
  creditsSpent: 5,
  creditsToppedUp: 6,
};
export const metricColorIndex = (name: string, fallback = 0) => METRIC_COLOR[name] ?? fallback;
/** Clases del círculo de ícono de una tarjeta para que coincida con el color de su serie. */
export const metricChip = (name: string) => CHIPS[metricColorIndex(name) % CHIPS.length];

const W = 640;
const H = 220;
const PAD = { top: 12, right: 16, bottom: 28, left: 44 };

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  const n = value / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

/** Gráfico de líneas simple en SVG con tokens de color; incluye tabla oculta equivalente para lectores de pantalla. */
export function LineChart({ series, locale, title, format }: { series: ChartSeries[]; locale: Locale; title: string; /** Formato de los valores en el tooltip y en la etiqueta final (por defecto, número). */ format?: (value: number) => string }) {
  const fmt = format ?? ((value: number) => formatNumber(value, locale));
  const titleId = useId();
  const dates = Array.from(new Set(series.flatMap((s) => s.points.map((p) => p.date)))).sort();
  const maxValue = niceMax(Math.max(0, ...series.flatMap((s) => s.points.map((p) => p.value))));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (dates.length <= 1 ? innerW / 2 : (i / (dates.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / maxValue) * innerH;
  const steps = maxValue % 5 === 0 ? 5 : 4;
  const ticks = Array.from({ length: steps + 1 }, (_, i) => (i * maxValue) / steps);
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
          const ci = metricColorIndex(s.name, si);
          const tip = (d: string, v: number) => `${s.label}: ${fmt(v)} (${formatDate(`${d}T12:00:00Z`, locale, 'short')})`;
          const last = pts[pts.length - 1];
          return (
            <g key={s.name}>
              {series.length === 1 && pts.length > 1 ? (
                <polygon
                  points={`${x(pts[0]?.i ?? 0)},${y(0)} ${pts.map((p) => `${x(p.i)},${y(p.v)}`).join(' ')} ${x(last?.i ?? 0)},${y(0)}`}
                  className={AREAS[ci % AREAS.length]}
                />
              ) : null}
              <polyline
                fill="none"
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                className={STROKES[ci % STROKES.length]}
                points={pts.map((p) => `${x(p.i)},${y(p.v)}`).join(' ')}
              />
              {pts.map((p) => (
                <circle key={p.d} cx={x(p.i)} cy={y(p.v)} r={3} className={FILLS[ci % FILLS.length]}>
                  <title>{tip(p.d, p.v)}</title>
                </circle>
              ))}
              {series.length === 1 && last ? (
                <text x={Math.min(x(last.i), W - PAD.right)} y={Math.max(y(last.v) - 10, PAD.top + 10)} textAnchor="end" className="fill-chart-axis text-xs font-semibold">
                  {fmt(last.v)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s, si) => (
          <span key={s.name} className="inline-flex items-center gap-1.5 text-xs text-secondary">
            <span aria-hidden className={`size-2.5 rounded-full ${SWATCHES[metricColorIndex(s.name, si) % SWATCHES.length]}`} />
            {s.label}
          </span>
        ))}
      </figcaption>
      <div className="sr-only">
      <table>
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
      </div>
    </figure>
  );
}
