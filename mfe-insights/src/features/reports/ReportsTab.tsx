import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { useReports } from '../../app/hooks';
import { useServices } from '../../app/services';
import type { Report } from '../../lib/types';
import { ReportDetail } from './ReportDetail';
import { ReportList } from './ReportList';
import { RequestReportForm } from './RequestReportForm';

export function ReportsTab({ reports, onOpenRuns }: { reports: ReturnType<typeof useReports>; onOpenRuns: () => void }) {
  const { bridge } = useServices();
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = reports.items.find((r) => r.id === selectedId) ?? null;

  const onRequested = (report: Report) => {
    reports.upsert(report);
    setSelectedId(report.id);
    bridge.toast('info', 'insights:reports.toast.requested');
  };

  return (
    <div className="bi-stack" role="tabpanel" aria-label={t('tabs.reports')}>
      <RequestReportForm onRequested={onRequested} />
      {selected ? (
        <ReportDetail
          report={selected}
          onClose={() => setSelectedId(null)}
          onNeedDetail={reports.ensureDetail}
          onOpenRun={onOpenRuns}
        />
      ) : null}
      <ReportList
        items={reports.items}
        status={reports.status}
        error={reports.error}
        hasNext={reports.hasNext}
        loadingMore={reports.loadingMore}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onRefresh={() => void reports.load()}
        onLoadMore={() => void reports.loadMore()}
      />
    </div>
  );
}
