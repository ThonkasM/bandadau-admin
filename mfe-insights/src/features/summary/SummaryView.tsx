import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { useAgentRuns, useAlerts, useReports } from '../../app/hooks';
import { useServices } from '../../app/services';
import { SeverityIcon, Spinner, useFormat } from '../../components/ui';
import { splitAnswer } from '../../lib/answer';
import { normalizeDataset } from '../../lib/dataset';
import type { Report } from '../../lib/types';
import { ReportChart } from '../reports/ReportChart';
import { RequestReportForm } from '../reports/RequestReportForm';

const TOP_ALERTS = 3;

/**
 * Vista gerencial (`view="summary"`): tres cifras, la conclusión del último reporte con un solo gráfico y las
 * alertas más recientes. Lo demás (tablas, catálogo de preguntas, ejecuciones de agentes) queda en la vista detallada.
 */
export function SummaryView({
  reports,
  alerts,
  runs,
}: {
  reports: ReturnType<typeof useReports>;
  alerts: ReturnType<typeof useAlerts>;
  runs: ReturnType<typeof useAgentRuns>;
}) {
  const { t } = useTranslation();
  const { bridge } = useServices();
  const { relative } = useFormat();

  const ready = useMemo(() => reports.items.filter((r) => r.status === 'READY'), [reports.items]);
  const latest = ready[0] ?? null;
  const pending = reports.items.some((r) => r.status === 'PENDING' || r.status === 'RUNNING');
  const lastRun = runs.items[0] ?? null;
  const topAlerts = alerts.items.filter((a) => a.status === 'OPEN').slice(0, TOP_ALERTS);

  // La lista trae solo el resumen del reporte: se pide el detalle del último para mostrar su respuesta y su gráfico.
  const hasDetail = latest ? latest.markdown !== undefined || latest.chart !== undefined || latest.dataset !== undefined : true;
  useEffect(() => {
    if (latest && !hasDetail) void reports.ensureDetail(latest.id);
  }, [latest, hasDetail, reports]);

  const { answer } = useMemo(() => splitAnswer(latest?.markdown), [latest?.markdown]);
  const dataset = useMemo(() => normalizeDataset(latest?.dataset), [latest?.dataset]);

  const onRequested = (report: Report) => {
    reports.upsert(report);
    bridge.toast('info', 'insights:reports.toast.requested');
  };

  return (
    <div className="bi-app" data-testid="summary-view">
      <section className="bi-card" aria-labelledby="bi-sum-ask">
        <h2 id="bi-sum-ask" className="bi-card__title">
          {t('summary.ask')}
        </h2>
        <RequestReportForm onRequested={onRequested} />
      </section>

      {pending ? (
        <div className="bi-progress" role="status" aria-live="polite">
          <Spinner />
          <span>{t('reports.detail.generating')}</span>
        </div>
      ) : null}

      <section className="bi-card" aria-labelledby="bi-sum-title">
        <h2 id="bi-sum-title" className="bi-card__title">
          {t('summary.conclusion')}
        </h2>
        {latest ? (
          <>
            <p className="bi-question">
              <span className="bi-label">{t('reports.detail.question')}</span>
              <span>{latest.question}</span>
            </p>
            {answer ? <p className="bi-answer__text">{answer}</p> : <p className="bi-hint">{latest.title ?? t('summary.noAnswer')}</p>}
            {latest.chart ? <ReportChart chart={latest.chart} dataset={dataset} /> : null}
          </>
        ) : (
          <p className="bi-hint">{reports.status === 'loading' ? t('states.loading') : t('summary.noneYet')}</p>
        )}
      </section>

      <div className="bi-kpis">
        <div className="bi-kpi">
          <p className="bi-kpi__label">{t('summary.openAlerts')}</p>
          <p className="bi-kpi__value">{alerts.openCount}</p>
          <p className="bi-hint">{alerts.openCount === 0 ? t('summary.allClear') : t('summary.needsAttention')}</p>
        </div>
        <div className="bi-kpi">
          <p className="bi-kpi__label">{t('summary.lastMonitoring')}</p>
          <p className="bi-kpi__value">{lastRun ? t(`enums:AgentRunStatus.${lastRun.status}`) : t('summary.none')}</p>
          <p className="bi-hint">{lastRun ? relative(lastRun.startedAt) : ''}</p>
        </div>
        <div className="bi-kpi">
          <p className="bi-kpi__label">{t('summary.reportsReady')}</p>
          <p className="bi-kpi__value">{ready.length}</p>
          <p className="bi-hint">{latest ? t('summary.latestAt', { when: relative(latest.completedAt ?? latest.createdAt) }) : t('summary.noneYet')}</p>
        </div>
      </div>

      {topAlerts.length > 0 ? (
        <section className="bi-card" aria-labelledby="bi-sum-alerts">
          <h2 id="bi-sum-alerts" className="bi-card__title">
            {t('summary.recentAlerts')}
          </h2>
          <ul className="bi-alerts">
            {topAlerts.map((alert) => (
              <li key={alert.id} className="bi-alert">
                <SeverityIcon severity={alert.severity} />
                <span>{alert.message}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

    </div>
  );
}
