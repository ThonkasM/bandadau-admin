import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, SeverityIcon, StateBox } from '../components/ui';
import { AgentRunsTab } from '../features/agent-runs/AgentRunsTab';
import { AlertsTab } from '../features/alerts/AlertsTab';
import { ReportsTab } from '../features/reports/ReportsTab';
import { SummaryView } from '../features/summary/SummaryView';
import type { Alert } from '../lib/types';
import { useAgentRuns, useAlerts, useReports } from './hooks';
import { errorCode, useErrorMessage, useHost, useServices } from './services';

type TabId = 'reports' | 'alerts' | 'runs';
const TABS: TabId[] = ['reports', 'alerts', 'runs'];

/** Raíz de la UI: pestañas Reportes / Alertas / Ejecuciones (P-ADM-06). */
export function App() {
  const { t } = useTranslation();
  const { service, bridge } = useServices();
  const { graphqlUrl, accessToken, view } = useHost();
  const errorMessage = useErrorMessage();
  const [tab, setTab] = useState<TabId>('reports');
  const [running, setRunning] = useState(false);
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({ reports: null, alerts: null, runs: null });

  const reports = useReports();
  const runs = useAgentRuns();
  const onLive = useCallback(
    (alert: Alert) => {
      bridge.toast('info', 'insights:alerts.newAlert', {
        severity: t(`enums:AlertSeverity.${alert.severity}`),
        title: t(`alerts.kind.${alert.kind}`),
      });
    },
    [bridge, t],
  );
  const alerts = useAlerts(onLive);

  // Aviso (toast del shell) cuando un reporte en curso termina.
  const seen = useRef(new Map<string, string>());
  useEffect(() => {
    for (const report of reports.items) {
      const before = seen.current.get(report.id);
      if (before && (before === 'PENDING' || before === 'RUNNING')) {
        if (report.status === 'READY') bridge.toast('success', 'insights:reports.toast.ready');
        else if (report.status === 'FAILED') bridge.toast('error', 'insights:reports.toast.failed');
      }
      seen.current.set(report.id, report.status);
    }
  }, [reports.items, bridge]);

  const runNow = async () => {
    setRunning(true);
    try {
      const run = await service.runMonitoringNow();
      runs.prepend(run);
      void alerts.load();
      if (run.status === 'FAILED' || run.status === 'ABORTED') bridge.toast('error', 'insights:alerts.runFailed');
      else bridge.toast('success', 'insights:alerts.runDone', { count: run.alerts.length });
    } catch (error) {
      bridge.emit('bandada:toast', { kind: 'error', message: errorMessage(error) });
    } finally {
      setRunning(false);
    }
  };

  const onTabKey = (event: React.KeyboardEvent, index: number) => {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = TABS[(index + delta + TABS.length) % TABS.length] as TabId;
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  if (!graphqlUrl) {
    return <StateBox tone="error" role="alert" title={t('states.contract.title')} body={t('states.contract.body')} testId="state-contract" />;
  }
  if (!accessToken) {
    return <StateBox role="status" body={t('states.waitingSession')} testId="state-waiting" />;
  }
  // Fase 1: el gateway responde `FEATURE_DISABLED` a los campos de insights → estado explicativo.
  const disabled = [reports.error, alerts.error, runs.error].some((e) => e && errorCode(e) === 'FEATURE_DISABLED');
  if (disabled) {
    return (
      <StateBox
        tone="info"
        role="status"
        title={t('states.featureDisabled.title')}
        body={t('states.featureDisabled.body')}
        testId="state-feature-disabled"
        action={<Button onClick={() => { void reports.load(); void alerts.load(); void runs.load(); }}>{t('states.retry')}</Button>}
      />
    );
  }

  if (view === 'summary') {
    return <SummaryView reports={reports} alerts={alerts} runs={runs} />;
  }

  return (
    <div className="bi-app">
      <header className="bi-header">
        <h1 className="bi-title">
          <SeverityIcon severity="INFO" />
          <span>{t('title')}</span>
        </h1>
      </header>
      <div className="bi-tabs" role="tablist" aria-label={t('tabs.label')}>
        {TABS.map((id, index) => (
          <button
            key={id}
            ref={(el) => {
              tabRefs.current[id] = el;
            }}
            id={`bi-tab-${id}`}
            type="button"
            role="tab"
            className="bi-tab"
            aria-selected={tab === id}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
            onKeyDown={(e) => onTabKey(e, index)}
          >
            <span>{t(`tabs.${id}`)}</span>
            {id === 'alerts' && alerts.openCount > 0 ? (
              <span className="bi-count" aria-label={t('tabs.openAlerts', { count: alerts.openCount })}>
                {alerts.openCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {tab === 'reports' ? <ReportsTab reports={reports} onOpenRuns={() => setTab('runs')} /> : null}
      {tab === 'alerts' ? <AlertsTab alerts={alerts} running={running} onRunNow={() => void runNow()} /> : null}
      {tab === 'runs' ? <AgentRunsTab runs={runs} /> : null}
    </div>
  );
}
