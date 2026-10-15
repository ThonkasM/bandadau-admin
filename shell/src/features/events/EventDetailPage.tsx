'use client';

import type { RegistrationStatus } from '@bandada/contracts-ts/graphql/admin';
import { formatCredits, formatDateTime, formatNumber } from '@bandada/i18n';
import { ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'urql';

import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { type Column, DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Field, Select } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useLocale } from '@/lib/format';
import { eventStatusTone, registrationTone, sagaTone } from '@/lib/status';

import { EVENT_QUERY, type RegistrationRow,REGISTRATIONS_QUERY } from './graphql';

const STATUSES: RegistrationStatus[] = ['PENDING', 'CONFIRMED', 'FAILED', 'CANCELLATION_PENDING', 'CANCELLED'];

export default function EventDetailPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const id = useSearchParams().get('id') ?? '';
  const [status, setStatus] = useState<RegistrationStatus | ''>('');
  const [event, refetchEvent] = useQuery({ query: EVENT_QUERY, variables: { id }, pause: !id });
  const [regs, refetchRegs] = useQuery({ query: REGISTRATIONS_QUERY, variables: { eventId: id, status: status || null }, pause: !id });
  const e = event.data?.event;

  if (!id) return <EmptyState title={t('events:detail.notFound')} />;
  if (event.fetching && !e) return <Skeleton className="h-72 w-full" />;
  if (event.error && !e) return <Card><ErrorState error={event.error} onRetry={() => refetchEvent({ requestPolicy: 'network-only' })} /></Card>;
  if (!e) return <Card><EmptyState title={t('events:detail.notFound')} /></Card>;

  const columns: Column<RegistrationRow>[] = [
    { key: 'user', header: t('events:registrations.user'), cell: (r) => <span className="break-all">{r.user?.displayName ?? r.user?.email ?? t('events:registrations.unknownUser')}</span> },
    { key: 'status', header: t('events:registrations.status'), cell: (r) => <Badge tone={registrationTone[r.status]}>{t(`enums:RegistrationStatus.${r.status}`)}</Badge> },
    { key: 'failure', header: t('events:registrations.failure'), hideOnMobile: true, cell: (r) => (r.failureReason ? t(`enums:RegistrationFailureReason.${r.failureReason}`) : t('events:noValue')) },
    {
      key: 'saga',
      header: t('events:registrations.saga'),
      hideOnMobile: true,
      cell: (r) =>
        r.saga ? (
          <span className="flex flex-wrap items-center gap-1">
            <Badge tone={sagaTone[r.saga.status]}>{t(`enums:SagaStatus.${r.saga.status}`)}</Badge>
            <span className="text-xs text-muted">{t(`enums:SagaStep.${r.saga.step}`)}</span>
          </span>
        ) : (
          t('events:noValue')
        ),
    },
    { key: 'createdAt', header: t('events:registrations.createdAt'), cell: (r) => formatDateTime(r.createdAt, locale) },
  ];

  return (
    <>
      <Link href="/events/" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-link hover:underline focus-visible:outline-2 focus-visible:outline-focus">
        <ArrowLeft aria-hidden className="size-4 rtl:rotate-180" />
        {t('events:detail.back')}
      </Link>
      <PageHeader title={e.title} description={e.description ?? undefined} actions={<Badge tone={eventStatusTone[e.status]}>{t(`enums:EventStatus.${e.status}`)}</Badge>} />

      <Card className="mb-4">
        <CardBody>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [t('events:columns.startsAt'), formatDateTime(e.startsAt, locale)],
              [t('events:columns.venue'), e.venue],
              [t('events:columns.seats'), `${formatNumber(e.seatsTaken, locale)} / ${formatNumber(e.capacity, locale)}`],
              [t('events:columns.price'), e.priceCredits === 0 ? t('events:free') : formatCredits(e.priceCredits, locale)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</dt>
                <dd className="mt-0.5 text-sm text-primary">{value}</dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={t('events:registrations.title')}
          action={
            <Field label={t('events:filters.status')} className="min-w-52">
              {({ id: fid }) => (
                <Select id={fid} value={status} onChange={(ev) => setStatus(ev.target.value as RegistrationStatus | '')}>
                  <option value="">{t('events:filters.all')}</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t(`enums:RegistrationStatus.${s}`)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          }
        />
        {regs.error && !regs.data ? (
          <ErrorState error={regs.error} onRetry={() => refetchRegs({ requestPolicy: 'network-only' })} />
        ) : (
          <DataTable
            caption={t('events:registrations.caption')}
            columns={columns}
            rows={regs.data?.registrations ?? []}
            getRowId={(r) => r.id}
            loading={regs.fetching && !regs.data}
            empty={<EmptyState icon={Users} title={t('events:registrations.empty')} />}
          />
        )}
      </Card>
    </>
  );
}
