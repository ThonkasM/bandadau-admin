import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { useAgentRuns } from '../../app/hooks';
import { useErrorMessage } from '../../app/services';
import { Button, LoadingLine, StateBox, useFormat } from '../../components/ui';
import type { AgentRun } from '../../lib/types';

const RUN_TONE = { RUNNING: 'info', SUCCEEDED: 'success', FAILED: 'danger', ABORTED: 'neutral' } as const;
const KNOWN_STOP = ['COMPLETED', 'MAX_STEPS', 'MAX_TOKENS', 'ERROR', 'STEP_LIMIT', 'TOKEN_LIMIT'];
const KNOWN_TRIGGER = ['SCHEDULE', 'MANUAL', 'REPORT_REQUEST'];
const KNOWN_STEP = ['LLM', 'LLM_CALL', 'TOOL_CALL'];

function RunItem({ run, expanded, onToggle }: { run: AgentRun; expanded: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  const { date } = useFormat();
  const seconds = run.finishedAt ? (Date.parse(run.finishedAt) - Date.parse(run.startedAt)) / 1000 : null;
  const panelId = `bi-run-${run.id}`;
  return (
    <li className="bi-run" data-testid="agent-run">
      <button type="button" className="bi-row" aria-expanded={expanded} aria-controls={panelId} aria-label={t('runs.toggle', { id: run.id.slice(0, 8) })} onClick={onToggle}>
        <span className="bi-row__main">
          <span className="bi-row__title">
            {t(`enums:AgentKind.${run.agent}`)}
          </span>
          <span className="bi-row__meta">
            {KNOWN_TRIGGER.includes(run.trigger) ? t(`runs.trigger.${run.trigger}`) : run.trigger}
          </span>
          <span className="bi-row__meta">{t('runs.started', { when: date(run.startedAt) })}</span>
        </span>
        <span className="bi-row__side">
          <span className={`bi-badge bi-badge--${RUN_TONE[run.status]}`}>{t(`enums:AgentRunStatus.${run.status}`)}</span>
          {seconds !== null && Number.isFinite(seconds) ? <span className="bi-row__meta">{t('runs.duration', { seconds })}</span> : null}
        </span>
      </button>
      {expanded ? (
        <div id={panelId} className="bi-run__body">
          <p className="bi-hint">
            {run.model ? <span>{t('runs.model', { model: run.model })}</span> : null}
            {run.stopReason ? (
              <span>{t('runs.stopReason', { reason: KNOWN_STOP.includes(run.stopReason) ? t(`runs.stopReasonValue.${run.stopReason}`) : run.stopReason })}</span>
            ) : null}
            <span>{t('runs.alertsCreated', { count: run.alerts.length })}</span>
          </p>
          {run.tokens ? <p className="bi-hint">{t('runs.tokens', { input: run.tokens.input, output: run.tokens.output, total: run.tokens.total })}</p> : null}
          {run.toolsUsed.length > 0 ? (
            <p className="bi-hint">
              <span className="bi-label">{t('runs.tools')}</span> <code>{run.toolsUsed.join(', ')}</code>
            </p>
          ) : null}
          {run.error ? <StateBox tone="error" role="alert" body={t('runs.error', { message: run.error })} /> : null}
          <h3 className="bi-section__title">{t('runs.steps', { count: run.steps.length })}</h3>
          {run.steps.length === 0 ? (
            <p className="bi-hint">{t('runs.noSteps')}</p>
          ) : (
            <ol className="bi-steps">
              {run.steps.map((step) => (
                <li key={step.index} className={step.isError ? 'bi-step bi-step--error' : 'bi-step'}>
                  <span className="bi-step__head">
                    <strong>{t('runs.step', { index: step.index + 1, kind: KNOWN_STEP.includes(step.kind) ? t(`runs.stepKind.${step.kind}`) : step.kind })}</strong>
                    {step.toolName ? <code>{step.toolName}</code> : null}
                    <span className="bi-row__meta">{t('runs.stepDuration', { ms: step.durationMs })}</span>
                    {step.isError ? <span className="bi-badge bi-badge--danger">{t('runs.stepError')}</span> : null}
                  </span>
                  {step.outputSummary ? <span className="bi-step__out">{step.outputSummary}</span> : null}
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}
    </li>
  );
}

export function AgentRunsTab({ runs }: { runs: ReturnType<typeof useAgentRuns> }) {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="bi-stack" role="tabpanel" aria-label={t('tabs.runs')}>
      <section className="bi-card" aria-labelledby="bi-runs-title">
        <h2 id="bi-runs-title" className="bi-card__title">
          {t('runs.title')}
        </h2>
        {runs.status === 'loading' && runs.items.length === 0 ? <LoadingLine /> : null}
        {runs.status === 'error' ? (
          <StateBox tone="error" role="alert" body={errorMessage(runs.error)} action={<Button onClick={() => void runs.load()}>{t('states.retry')}</Button>} />
        ) : null}
        {runs.status === 'ready' && runs.items.length === 0 ? <StateBox body={t('runs.empty')} /> : null}
        {runs.items.length > 0 ? (
          <ul className="bi-list">
            {runs.items.map((run) => (
              <RunItem key={run.id} run={run} expanded={open === run.id} onToggle={() => setOpen(open === run.id ? null : run.id)} />
            ))}
          </ul>
        ) : null}
        {runs.hasNext ? (
          <div className="bi-center">
            <Button onClick={() => void runs.loadMore()} busy={runs.loadingMore} disabled={runs.loadingMore}>
              {t('runs.loadMore')}
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
