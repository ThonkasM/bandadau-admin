import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useRealtimeStatus } from '../../app/hooks';
import { Button, Spinner, StateBox, useFormat } from '../../components/ui';
import { answerMeta, splitAnswer } from '../../lib/answer';
import { normalizeDataset } from '../../lib/dataset';
import type { Report } from '../../lib/types';
import { AudioPlayer } from './AudioPlayer';
import { DatasetTable } from './DatasetTable';
import { Markdown } from './Markdown';
import { ReportChart } from './ReportChart';
import { ReportStatusBadge } from './ReportStatusBadge';

const KNOWN_FAILURES = ['OUT_OF_SCOPE', 'DATA_UNAVAILABLE', 'BUDGET_EXCEEDED', 'LLM_UNAVAILABLE'] as const;

/** UC-19 paso 16: markdown + gráfico + tabla + audio + herramientas/tokens del reporte. */
export function ReportDetail({
  report,
  onClose,
  onNeedDetail,
  onOpenRun,
}: {
  report: Report;
  onClose: () => void;
  onNeedDetail: (id: string) => Promise<void>;
  onOpenRun: () => void;
}) {
  const { t } = useTranslation();
  const { date } = useFormat();
  const realtime = useRealtimeStatus();
  const terminal = report.status === 'READY' || report.status === 'FAILED';
  const hasDetail = report.markdown !== undefined || report.chart !== undefined || report.dataset !== undefined;

  // La lista solo trae el resumen: al abrir un reporte terminado se pide el detalle (`report(id)`).
  useEffect(() => {
    if (terminal && !hasDetail) void onNeedDetail(report.id);
  }, [terminal, hasDetail, report.id, onNeedDetail]);

  const { answer, rest } = useMemo(() => splitAnswer(report.markdown), [report.markdown]);
  const dataset = useMemo(() => normalizeDataset(report.dataset), [report.dataset]);
  const meta = answerMeta(report);
  const failure = report.failureReason
    ? (KNOWN_FAILURES as readonly string[]).includes(report.failureReason)
      ? t(`reports.failure.${report.failureReason}`)
      : t('reports.failure.unknown')
    : t('reports.failure.unknown');

  return (
    <article className="bi-card bi-report" aria-labelledby="bi-report-title" data-testid="report-detail">
      <div className="bi-card__head">
        <div>
          <h2 id="bi-report-title" className="bi-card__title">
            {report.title ?? t('reports.detail.title')}
          </h2>
          <p className="bi-row__meta">{t('reports.detail.requestedAt', { date: date(report.createdAt) })}</p>
        </div>
        <div className="bi-actions">
          <ReportStatusBadge status={report.status} />
          <Button onClick={onClose}>{t('reports.detail.close')}</Button>
        </div>
      </div>

      <p className="bi-question">
        <span className="bi-label">{t('reports.detail.question')}</span>
        <span>{report.question}</span>
      </p>

      {!terminal ? (
        <div className="bi-progress" role="status" aria-live="polite">
          <Spinner />
          <span>{t('reports.detail.generating')}</span>
          {realtime !== 'live' ? <span className="bi-hint">{t('reports.detail.pollingFallback')}</span> : null}
        </div>
      ) : null}

      {report.status === 'FAILED' ? <StateBox tone="error" role="alert" title={t('reports.detail.failed')} body={failure} /> : null}

      {report.status === 'READY' ? (
        <>
          {answer ? (
            <section className="bi-answer" aria-labelledby="bi-answer-title" data-testid="report-answer">
              <h3 id="bi-answer-title" className="bi-answer__label">
                {t('reports.detail.answer')}
              </h3>
              <p className="bi-answer__text">{answer}</p>
              {meta ? (
                <p className="bi-answer__meta" data-testid="answer-meta">
                  {meta.seconds === null ? t('reports.detail.answeredByNoTime', { model: meta.model }) : t('reports.detail.answeredBy', { model: meta.model, seconds: meta.seconds })}
                  {meta.tags.map((tag) => ` · ${t(`reports.detail.modelTag.${tag}`)}`).join('')}
                </p>
              ) : null}
            </section>
          ) : null}

          <section aria-labelledby="bi-audio-title" className="bi-section">
            <h3 id="bi-audio-title" className="bi-section__title">
              {t('reports.audio.title')}
            </h3>
            <AudioPlayer
              url={report.audioUrl}
              durationSeconds={report.audioDurationSeconds}
              onExpired={() => onNeedDetail(report.id)}
            />
          </section>

          <section aria-labelledby="bi-summary-title" className="bi-section">
            <h3 id="bi-summary-title" className="bi-section__title">
              {answer ? t('reports.detail.answerDetail') : t('reports.detail.summary')}
            </h3>
            {report.markdown ? <Markdown source={answer ? rest : report.markdown} /> : hasDetail ? <p className="bi-hint">{t('reports.detail.noMarkdown')}</p> : <Spinner />}
          </section>

          <section aria-labelledby="bi-chart-title" className="bi-section">
            <h3 id="bi-chart-title" className="bi-section__title">
              {t('reports.detail.chart')}
            </h3>
            {report.chart ? <ReportChart chart={report.chart} dataset={dataset} /> : hasDetail ? <p className="bi-hint">{t('reports.detail.noChart')}</p> : null}
          </section>

          <section aria-labelledby="bi-data-title" className="bi-section">
            <h3 id="bi-data-title" className="bi-section__title">
              {t('reports.detail.dataset')}
            </h3>
            {dataset ? <DatasetTable dataset={dataset} /> : hasDetail ? <p className="bi-hint">{t('reports.detail.datasetEmpty')}</p> : null}
          </section>
        </>
      ) : null}

      {report.agentRun ? (
        <footer className="bi-report__foot">
          <p className="bi-hint">
            <span className="bi-label">{t('reports.detail.tools')}</span>{' '}
            <span>{report.agentRun.toolsUsed.length > 0 ? report.agentRun.toolsUsed.join(', ') : t('reports.detail.toolsNone')}</span>
          </p>
          {report.agentRun.tokens ? <p className="bi-hint">{t('reports.detail.tokens', { count: report.agentRun.tokens.total })}</p> : null}
          <button type="button" className="bi-link" onClick={onOpenRun}>
            {t('reports.detail.agentRun')}
          </button>
        </footer>
      ) : null}
    </article>
  );
}
