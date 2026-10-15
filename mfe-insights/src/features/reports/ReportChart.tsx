import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useHost } from '../../app/services';
import { buildLocaleDefinitions, buildVegaConfig, tokenReader } from '../../lib/chart-theme';
import { datasetToObjects } from '../../lib/dataset';
import type { Dataset } from '../../lib/types';

type Spec = Record<string, unknown>;

/** Prepara la spec guardada: datos del dataset inyectados y sin `$schema` (la librería fija su propia versión). */
export function prepareSpec(raw: unknown, dataset: Dataset | null): Spec | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const spec: Spec = { ...(raw as Spec) };
  delete spec['$schema'];
  const rows = dataset ? datasetToObjects(dataset) : null;
  const data = spec['data'] as { name?: string; values?: unknown } | undefined;
  if (rows) {
    if (data?.name) spec['datasets'] = { ...(spec['datasets'] as object | undefined), [data.name]: rows };
    else if (!data?.values) spec['data'] = { values: rows };
  }
  if (spec['width'] === undefined) spec['width'] = 'container';
  if (spec['height'] === undefined) spec['height'] = 280;
  return spec;
}

/**
 * Gráfico Vega-Lite. `vega-embed` se carga dinámicamente (chunk aparte). Colores, fondo y ejes salen de los
 * tokens `--bd-*` del tema activo y se redibuja al cambiar `theme` / `locale`.
 */
export function ReportChart({ chart, dataset }: { chart: unknown; dataset: Dataset | null }) {
  const { t } = useTranslation();
  const { theme, locale } = useHost();
  const container = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const el = container.current;
    const spec = prepareSpec(chart, dataset);
    if (!el || !spec) {
      setState('error');
      return;
    }
    let cancelled = false;
    let finalize: (() => void) | undefined;
    setState('loading');
    void import('vega-embed')
      .then(async ({ default: embed }) => {
        // el anfitrión (data-theme) es el elemento con las variables del tema activo
        const host = (el.getRootNode() as ShadowRoot).host ?? el;
        const css = tokenReader(host);
        const result = await embed(el, spec as never, {
          actions: false,
          renderer: 'svg',
          mode: 'vega-lite',
          config: buildVegaConfig(css) as never,
          ...buildLocaleDefinitions(locale),
        });
        if (cancelled) result.finalize();
        else {
          finalize = () => result.finalize();
          setState('ready');
        }
      })
      .catch((error: unknown) => {
        console.error('event=insights.chart.render_failed', error);
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
      finalize?.();
    };
  }, [chart, dataset, theme, locale]);

  return (
    <figure className="bi-chart">
      <div ref={container} className="bi-chart__canvas" role="img" aria-label={t('reports.detail.chart')} hidden={state === 'error'} />
      {state === 'loading' ? <p className="bi-hint">{t('reports.detail.chartLoading')}</p> : null}
      {state === 'error' ? <p className="bi-hint" role="status">{t('reports.detail.chartError')}</p> : null}
    </figure>
  );
}
