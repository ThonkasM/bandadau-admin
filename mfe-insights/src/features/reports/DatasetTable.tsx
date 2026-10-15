import { formatNumber } from '@bandada/i18n/format';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useHost, useServices } from '../../app/services';
import { Button } from '../../components/ui';
import { datasetToCsv } from '../../lib/dataset';
import type { Dataset } from '../../lib/types';

export function DatasetTable({ dataset }: { dataset: Dataset }) {
  const { t } = useTranslation();
  const { bridge } = useServices();
  const { locale } = useHost();
  const [copied, setCopied] = useState(false);

  const cell = (value: unknown) => (typeof value === 'number' ? formatNumber(value, locale) : value === null || value === undefined ? '' : String(value));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(datasetToCsv(dataset));
      setCopied(true);
      bridge.toast('success', 'insights:reports.detail.copied');
    } catch {
      bridge.toast('error', 'insights:reports.detail.copyFailed');
    }
  };

  return (
    <div className="bi-dataset">
      <div className="bi-dataset__scroll" tabIndex={0} role="region" aria-label={t('reports.detail.dataset')}>
        <table className="bi-table">
          <thead>
            <tr>
              {dataset.columns.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataset.rows.map((row, r) => (
               
              <tr key={r}>
                {dataset.columns.map((c, i) => (
                   
                  <td key={`${c}-${i}`} className={typeof row[i] === 'number' ? 'bi-num' : undefined}>
                    {cell(row[i])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button onClick={() => void copy()} aria-live="polite" data-copied={copied || undefined}>
        {t('reports.detail.copyCsv')}
      </Button>
    </div>
  );
}
