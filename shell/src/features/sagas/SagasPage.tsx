'use client';

import type { SagaStatus, SagaType } from '@bandada/contracts-ts/graphql/admin';
import { formatRelative } from '@bandada/i18n';
import { RotateCw, Workflow } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from 'urql';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { type Column, DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Field, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from '@/components/ui/Toast';
import { shortId, useLocale } from '@/lib/format';
import { useErrorText } from '@/lib/graphql/errors';
import { sagaTone } from '@/lib/status';

import type { SagaRow } from '../events/graphql';
import { RETRY_SAGA, SAGAS_QUERY } from './graphql';

const STATUSES: SagaStatus[] = ['FAILED', 'COMPENSATED', 'COMPENSATING', 'AWAITING_DEBIT', 'AWAITING_TICKET', 'STARTED', 'COMPLETED'];
const TYPES: SagaType[] = ['REGISTRATION', 'CANCELLATION'];

export default function SagasPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const errorText = useErrorText();
  const [status, setStatus] = useState<SagaStatus | ''>('FAILED');
  const [type, setType] = useState<SagaType | ''>('');
  const [result, refetch] = useQuery({ query: SAGAS_QUERY, variables: { status: status || null, type: type || null, first: 50 } });
  const [retryState, retry] = useMutation(RETRY_SAGA);
  const [target, setTarget] = useState<SagaRow | null>(null);

  const confirmRetry = async () => {
    if (!target) return;
    const res = await retry({ id: target.id });
    const errors = res.data?.retrySaga.errors ?? [];
    if (res.error || errors.length > 0) {
      toast.error(errorText(res.error ?? errors[0]?.code));
    } else {
      toast.success(t('events:sagas.retried'));
      refetch({ requestPolicy: 'network-only' });
    }
    setTarget(null);
  };

  const columns: Column<SagaRow>[] = [
    { key: 'id', header: t('events:sagas.id'), cell: (s) => <span className="font-mono text-xs">{shortId(s.id)}</span> },
    { key: 'type', header: t('events:sagas.type'), cell: (s) => t(`enums:SagaType.${s.type}`) },
    { key: 'step', header: t('events:sagas.step'), hideOnMobile: true, cell: (s) => t(`enums:SagaStep.${s.step}`) },
    { key: 'status', header: t('events:sagas.status'), cell: (s) => <Badge tone={sagaTone[s.status]}>{t(`enums:SagaStatus.${s.status}`)}</Badge> },
    { key: 'failure', header: t('events:sagas.failure'), hideOnMobile: true, cell: (s) => (s.failureReason ? t(`enums:RegistrationFailureReason.${s.failureReason}`) : t('events:noValue')) },
    { key: 'retries', header: t('events:sagas.retries'), hideOnMobile: true, cell: (s) => s.retries },
    { key: 'updatedAt', header: t('events:sagas.updatedAt'), cell: (s) => formatRelative(s.updatedAt, locale) },
    {
      key: 'actions',
      header: <span className="sr-only">{t('events:sagas.actions')}</span>,
      className: 'text-end',
      cell: (s) =>
        s.status === 'FAILED' ? (
          <Button size="sm" variant="secondary" onClick={() => setTarget(s)} aria-label={t('events:sagas.retryAria', { id: shortId(s.id) })}>
            <RotateCw aria-hidden className="size-4" />
            {t('events:sagas.retry')}
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader title={t('events:sagas.title')} description={t('events:sagas.description')} />
      <Card>
        <div className="grid gap-3 border-b border-default p-4 sm:grid-cols-2">
          <Field label={t('events:sagas.status')}>
            {({ id }) => (
              <Select id={id} value={status} onChange={(e) => setStatus(e.target.value as SagaStatus | '')}>
                <option value="">{t('events:filters.all')}</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`enums:SagaStatus.${s}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('events:sagas.type')}>
            {({ id }) => (
              <Select id={id} value={type} onChange={(e) => setType(e.target.value as SagaType | '')}>
                <option value="">{t('events:filters.all')}</option>
                {TYPES.map((s) => (
                  <option key={s} value={s}>
                    {t(`enums:SagaType.${s}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        {result.error && !result.data ? (
          <ErrorState error={result.error} onRetry={() => refetch({ requestPolicy: 'network-only' })} />
        ) : (
          <DataTable
            caption={t('events:sagas.caption')}
            columns={columns}
            rows={result.data?.sagas ?? []}
            getRowId={(s) => s.id}
            loading={result.fetching && !result.data}
            empty={<EmptyState icon={Workflow} title={status === 'FAILED' ? t('events:sagas.emptyFailed') : t('events:sagas.empty')} />}
          />
        )}
      </Card>

      <Modal
        open={!!target}
        title={t('events:sagas.retryTitle', { id: target ? shortId(target.id) : '' })}
        onClose={() => setTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setTarget(null)}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={confirmRetry} loading={retryState.fetching}>
              {t('events:sagas.retryConfirm')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-secondary">{t('events:sagas.retryBody')}</p>
      </Modal>
    </>
  );
}
