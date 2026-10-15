import { useTranslation } from 'react-i18next';

import type { GeneratedReportStatus } from '../../lib/types';

const TONE: Record<GeneratedReportStatus, string> = {
  PENDING: 'neutral',
  RUNNING: 'info',
  READY: 'success',
  FAILED: 'danger',
};

export function ReportStatusBadge({ status }: { status: GeneratedReportStatus }) {
  const { t } = useTranslation();
  return (
    <span className={`bi-badge bi-badge--${TONE[status]}`} data-status={status}>
      {t(`enums:GeneratedReportStatus.${status}`)}
    </span>
  );
}
