'use client';

import type { EventStatus } from '@bandada/contracts-ts/graphql/admin';
import { formatCredits, formatDateTime, formatNumber } from '@bandada/i18n';
import { CalendarDays, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'urql';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { type Column, DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Field, Input, Select } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { useDebounced } from '@/hooks/useDebounced';
import { useLocale } from '@/lib/format';
import { eventStatusTone } from '@/lib/status';

import { type EventRow,EVENTS_QUERY } from './graphql';

const STATUSES: EventStatus[] = ['DRAFT', 'PUBLISHED', 'CANCELLED', 'FINISHED'];

export default function EventsPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<EventStatus | ''>('');
  const query = useDebounced(search.trim(), 300);
  const [result, refetch] = useQuery({ query: EVENTS_QUERY, variables: { first: 50, filter: { query: query || null, status: status || null } } });
  const rows = result.data?.events ?? [];

  const columns: Column<EventRow>[] = [
    { key: 'title', header: t('events:columns.title'), cell: (e) => <span className="font-medium">{e.title}</span> },
    { key: 'startsAt', header: t('events:columns.startsAt'), cell: (e) => formatDateTime(e.startsAt, locale) },
    { key: 'venue', header: t('events:columns.venue'), hideOnMobile: true, cell: (e) => e.venue },
    { key: 'seats', header: t('events:columns.seats'), cell: (e) => `${formatNumber(e.seatsTaken, locale)} / ${formatNumber(e.capacity, locale)}` },
    { key: 'price', header: t('events:columns.price'), hideOnMobile: true, cell: (e) => (e.priceCredits === 0 ? t('events:free') : formatCredits(e.priceCredits, locale)) },
    { key: 'status', header: t('events:columns.status'), cell: (e) => <Badge tone={eventStatusTone[e.status]}>{t(`enums:EventStatus.${e.status}`)}</Badge> },
    {
      key: 'actions',
      header: <span className="sr-only">{t('events:columns.actions')}</span>,
      className: 'text-end',
      cell: (e) => (
        <Link
          href={`/events/detail/?id=${encodeURIComponent(e.id)}`}
          aria-label={t('events:viewAria', { title: e.title })}
          className="inline-flex min-h-9 items-center rounded-md px-3 text-sm font-semibold text-link hover:underline focus-visible:outline-2 focus-visible:outline-focus"
        >
          {t('events:view')}
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t('events:title')} description={t('events:description')} />
      <Card>
        <div className="grid gap-3 border-b border-default p-4 sm:grid-cols-2">
          <Field label={t('events:filters.search')}>
            {({ id }) => (
              <div className="relative">
                <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <Input id={id} type="search" className="ps-9" value={search} placeholder={t('events:filters.searchPlaceholder')} onChange={(e) => setSearch(e.target.value)} />
              </div>
            )}
          </Field>
          <Field label={t('events:filters.status')}>
            {({ id }) => (
              <Select id={id} value={status} onChange={(e) => setStatus(e.target.value as EventStatus | '')}>
                <option value="">{t('events:filters.all')}</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`enums:EventStatus.${s}`)}
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
            caption={t('events:tableCaption')}
            columns={columns}
            rows={rows}
            getRowId={(e) => e.id}
            loading={result.fetching && rows.length === 0}
            empty={<EmptyState icon={CalendarDays} title={t('events:empty')} />}
          />
        )}
      </Card>
      <p className="mt-3 text-xs text-muted">{t('events:limitNote', { count: 50 })}</p>
    </>
  );
}
