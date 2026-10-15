import { useTranslation } from 'react-i18next';

import { isInFlight, type LoadStatus } from '../../app/hooks';
import { useErrorMessage } from '../../app/services';
import { Button, LoadingLine, StateBox, useFormat } from '../../components/ui';
import type { Report } from '../../lib/types';
import { ReportStatusBadge } from './ReportStatusBadge';

export function ReportList({
  items,
  status,
  error,
  hasNext,
  loadingMore,
  selectedId,
  onSelect,
  onRefresh,
  onLoadMore,
}: {
  items: Report[];
  status: LoadStatus;
  error: unknown;
  hasNext: boolean;
  loadingMore: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRefresh: () => void;
  onLoadMore: () => void;
}) {
  const { t } = useTranslation();
  const { relative } = useFormat();
  const errorMessage = useErrorMessage();

  return (
    <section className="bi-card" aria-labelledby="bi-list-title">
      <div className="bi-card__head">
        <h2 id="bi-list-title" className="bi-card__title">
          {t('reports.list.title')}
        </h2>
        <Button onClick={onRefresh} disabled={status === 'loading'}>
          {t('reports.list.refresh')}
        </Button>
      </div>
      {status === 'loading' && items.length === 0 ? <LoadingLine /> : null}
      {status === 'error' && items.length === 0 ? (
        <StateBox
          tone="error"
          role="alert"
          body={errorMessage(error)}
          action={<Button onClick={onRefresh}>{t('states.retry')}</Button>}
        />
      ) : null}
      {status === 'ready' && items.length === 0 ? <StateBox body={t('reports.list.empty')} /> : null}
      {items.length > 0 ? (
        <ul className="bi-list">
          {items.map((report) => (
            <li key={report.id}>
              <button
                type="button"
                className="bi-row"
                aria-current={report.id === selectedId ? 'true' : undefined}
                onClick={() => onSelect(report.id)}
              >
                <span className="bi-row__main">
                  <span className="bi-row__title">{report.title ?? report.question}</span>
                  <span className="bi-row__meta">
                    {report.title ? report.question : t('reports.list.untitled')}
                  </span>
                  {isInFlight(report) ? <span className="bi-row__meta">{t('reports.list.pendingHint')}</span> : null}
                </span>
                <span className="bi-row__side">
                  <ReportStatusBadge status={report.status} />
                  <time className="bi-row__meta" dateTime={report.createdAt}>
                    {relative(report.createdAt)}
                  </time>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {hasNext ? (
        <div className="bi-center">
          <Button onClick={onLoadMore} busy={loadingMore} disabled={loadingMore}>
            {t('reports.list.loadMore')}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
