import { useTranslation } from 'react-i18next';

import type { useAlerts } from '../../app/hooks';
import { useErrorMessage, useServices } from '../../app/services';
import { Button, LoadingLine, SeverityIcon, StateBox, useFormat } from '../../components/ui';
import type { Alert, AlertStatus } from '../../lib/types';

const FILTERS: AlertStatus[] = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'];

function detailsText(details: unknown): string | null {
  if (details === null || details === undefined) return null;
  if (typeof details === 'string') return details;
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return null;
  }
}

function AlertItem({ alert, busy, onAck }: { alert: Alert; busy: boolean; onAck: () => void }) {
  const { t } = useTranslation();
  const { relative } = useFormat();
  const title = t(`alerts.kind.${alert.kind}`);
  const extra = detailsText(alert.details);
  return (
    <li className={`bi-alert bi-alert--${alert.severity.toLowerCase()}`} data-severity={alert.severity} data-testid="alert-item">
      <div className="bi-alert__head">
        <span className="bi-sev">
          <SeverityIcon severity={alert.severity} />
          <span>{t(`enums:AlertSeverity.${alert.severity}`)}</span>
        </span>
        <strong className="bi-alert__title">{title}</strong>
        <time className="bi-row__meta" dateTime={alert.raisedAt}>
          {t('alerts.raised', { when: relative(alert.raisedAt) })}
        </time>
      </div>
      <p className="bi-alert__msg">{alert.message}</p>
      <p className="bi-row__meta bi-alert__meta">
        {alert.resource ? <span>{t('alerts.resource', { resource: alert.resource })}</span> : null}
        <span>{t('alerts.occurrences', { count: alert.occurrences })}</span>
        <span className="bi-badge bi-badge--neutral">{t(`enums:AlertStatus.${alert.status}`)}</span>
        {alert.acknowledgedAt ? <span>{t('alerts.acknowledgedAt', { when: relative(alert.acknowledgedAt) })}</span> : null}
      </p>
      {extra ? (
        <details className="bi-details">
          <summary>{t('alerts.details')}</summary>
          <pre>{extra}</pre>
        </details>
      ) : null}
      {alert.status === 'OPEN' ? (
        <Button onClick={onAck} busy={busy} disabled={busy} aria-label={t('alerts.acknowledgeLabel', { title })}>
          {busy ? t('alerts.acknowledging') : t('alerts.acknowledge')}
        </Button>
      ) : null}
    </li>
  );
}

/** UC-20: alertas por severidad, en vivo (`alertRaised`), reconocer y ejecutar monitoreo ahora. */
export function AlertsTab({
  alerts,
  running,
  onRunNow,
}: {
  alerts: ReturnType<typeof useAlerts>;
  running: boolean;
  onRunNow: () => void;
}) {
  const { t } = useTranslation();
  const { bridge } = useServices();
  const errorMessage = useErrorMessage();

  const ack = async (id: string) => {
    try {
      await alerts.acknowledge(id);
      bridge.toast('success', 'insights:alerts.acknowledged');
    } catch (error) {
      bridge.emit('bandada:toast', { kind: 'error', message: errorMessage(error) });
    }
  };

  return (
    <div className="bi-stack" role="tabpanel" aria-label={t('tabs.alerts')}>
      <section className="bi-card" aria-labelledby="bi-alerts-title">
        <div className="bi-card__head">
          <h2 id="bi-alerts-title" className="bi-card__title">
            {t('alerts.title')}
          </h2>
          <span className={`bi-live bi-live--${alerts.realtimeState}`} role="status" aria-label={t('alerts.live.label')}>
            <span className="bi-live__dot" aria-hidden="true" />
            <span>{t(`alerts.live.${alerts.realtimeState}`)}</span>
          </span>
        </div>
        <div className="bi-toolbar">
          <div className="bi-segmented" role="group" aria-label={t('alerts.filter.label')}>
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className="bi-seg"
                aria-pressed={alerts.filter === f}
                onClick={() => alerts.setFilter(f)}
              >
                {t(`enums:AlertStatus.${f}`)}
              </button>
            ))}
          </div>
          <Button variant="primary" onClick={onRunNow} busy={running} disabled={running}>
            {running ? t('alerts.running') : t('alerts.runNow')}
          </Button>
        </div>
        {alerts.status === 'loading' && alerts.items.length === 0 ? <LoadingLine /> : null}
        {alerts.status === 'error' ? (
          <StateBox tone="error" role="alert" body={errorMessage(alerts.error)} action={<Button onClick={() => void alerts.load()}>{t('states.retry')}</Button>} />
        ) : null}
        {alerts.status === 'ready' && alerts.items.length === 0 ? <StateBox body={t('alerts.empty')} /> : null}
        {alerts.items.length > 0 ? (
          <ul className="bi-alerts" aria-live="polite">
            {alerts.items.map((alert) => (
              <AlertItem key={alert.id} alert={alert} busy={alerts.acking.has(alert.id)} onAck={() => void ack(alert.id)} />
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
