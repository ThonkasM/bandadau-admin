'use client';

import { formatCredits, formatDateTime, formatNumber } from '@bandada/i18n';
import { Download, FileText } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'urql';

import { BarChart } from '@/components/charts/BarChart';
import { LineChart } from '@/components/charts/LineChart';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { type Column, DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Field, Select } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { cn } from '@/lib/cn';
import { downloadCsv } from '@/lib/csv';
import { daysAgo, isoDate, useLocale } from '@/lib/format';
import { eventStatusTone, sagaTone } from '@/lib/status';

import { EVENTS_QUERY } from '../events/graphql';
import {
  type CreditPoint,
  type EventReportRow,
  EVENTS_REPORT_QUERY,
  type PersonRef,
  REGISTRATION_TOTALS_QUERY,
  type SagaReportRow,
  SAGAS_REPORT_QUERY,
  TICKET_VALIDATIONS_QUERY,
  type TicketValidationRow,
  WALLET_REPORT_QUERY,
} from './graphql';

const RANGES = [7, 30, 90] as const;
const REPORTS = ['attendance', 'registrations', 'sagas', 'credits'] as const;
const WHEN = ['all', 'upcoming', 'past'] as const;
type ReportId = (typeof REPORTS)[number];

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card>
      <CardBody>
        <p className="text-sm text-muted">{label}</p>
        <p className="font-display text-2xl font-bold text-primary">{value}</p>
      </CardBody>
    </Card>
  );
}

/** Reportes tradicionales (sin IA): tablas fijas con rango de fechas y exportación a CSV. */
export default function ReportsPage() {
  const { t } = useTranslation('reports');
  const locale = useLocale();
  const [report, setReport] = useState<ReportId>('attendance');
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [eventId, setEventId] = useState('');
  const [when2, setWhen2] = useState<(typeof WHEN)[number]>('all');

  const range = useMemo(() => ({ from: isoDate(daysAgo(days - 1)), to: isoDate(new Date()) }), [days]);
  const person = (p: PersonRef | null) => p?.displayName ?? p?.email ?? t('unknownUser');
  const when = (iso: string) => formatDateTime(iso, locale, 'medium');

  const [events] = useQuery({ query: EVENTS_QUERY, variables: { first: 50 } });
  const [validations, refetchValidations] = useQuery({
    query: TICKET_VALIDATIONS_QUERY,
    variables: { range, eventId: eventId || null, first: 90 },
    pause: report !== 'attendance',
  });
  const [eventRows, refetchEvents] = useQuery({
    query: EVENTS_REPORT_QUERY,
    variables: {},
    pause: report !== 'registrations' && report !== 'attendance',
  });
  const [sagaRows, refetchSagas] = useQuery({ query: SAGAS_REPORT_QUERY, variables: { since: `${range.from}T00:00:00Z`, first: 50 }, pause: report !== 'sagas' });
  const [totals, refetchTotals] = useQuery({ query: REGISTRATION_TOTALS_QUERY, variables: { range }, pause: report !== 'registrations' });
  const [wallet, refetchWallet] = useQuery({ query: WALLET_REPORT_QUERY, variables: { range }, pause: report !== 'credits' });

  const refresh = () => {
    if (report === 'attendance') {
      refetchValidations({ requestPolicy: 'network-only' });
      refetchEvents({ requestPolicy: 'network-only' });
    }
    if (report === 'sagas') refetchSagas({ requestPolicy: 'network-only' });
    if (report === 'registrations') {
      refetchEvents({ requestPolicy: 'network-only' });
      refetchTotals({ requestPolicy: 'network-only' });
    }
    if (report === 'credits') refetchWallet({ requestPolicy: 'network-only' });
  };

  const fileName = (name: string) => `bandada-${name}-${range.from}_${range.to}.csv`;

  // ---- Asistencia ------------------------------------------------------------------------------------------------
  const attendance = useMemo(() => validations.data?.ticketValidations.items ?? [], [validations.data]);
  const attendanceColumns: Column<TicketValidationRow>[] = [
    { key: 'when', header: t('attendance.when'), cell: (v) => when(v.validatedAt) },
    { key: 'event', header: t('attendance.event'), cell: (v) => v.eventTitle },
    {
      key: 'what',
      header: t('attendance.what'),
      cell: (v) => t('attendance.sentence', { organizer: person(v.validatedBy), attendee: person(v.attendee) }),
    },
  ];
  const exportAttendance = () =>
    downloadCsv(
      fileName('asistencia'),
      [t('attendance.when'), t('attendance.event'), t('attendance.scannedBy'), t('attendance.attendee')],
      attendance.map((v) => [v.validatedAt, v.eventTitle, person(v.validatedBy), person(v.attendee)]),
    );

  const attendanceByEvent = useMemo(() => {
    const scanned = new Map<string, number>();
    for (const v of attendance) scanned.set(v.eventId, (scanned.get(v.eventId) ?? 0) + 1);
    const rows = (eventRows.data?.events ?? []).filter((e) => scanned.has(e.id)).map((e) => ({ id: e.id, title: e.title, startsAt: e.startsAt, enrolled: e.seatsTaken, scanned: scanned.get(e.id) ?? 0 }));
    return rows.sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  }, [attendance, eventRows.data]);
  const pct = (a: number, b: number) => (b > 0 ? `${formatNumber(Math.round((a / b) * 100), locale)} %` : t('noValue'));
  const byEventColumns: Column<(typeof attendanceByEvent)[number]>[] = [
    { key: 'title', header: t('attendance.event'), cell: (r) => r.title },
    { key: 'startsAt', header: t('registrations.startsAt'), hideOnMobile: true, cell: (r) => when(r.startsAt) },
    { key: 'enrolled', header: t('attendance.enrolled'), cell: (r) => formatNumber(r.enrolled, locale) },
    { key: 'scanned', header: t('attendance.scanned'), cell: (r) => formatNumber(r.scanned, locale) },
    { key: 'rate', header: t('attendance.rate'), cell: (r) => pct(r.scanned, r.enrolled) },
  ];

  // ---- Inscripciones ---------------------------------------------------------------------------------------------
  const nowIso = new Date().toISOString();
  const eventList = (eventRows.data?.events ?? []).filter((e) => (when2 === 'upcoming' ? e.startsAt >= nowIso : when2 === 'past' ? e.startsAt < nowIso : true));
  const eventColumns: Column<EventReportRow>[] = [
    { key: 'title', header: t('registrations.event'), cell: (e) => e.title },
    { key: 'organizer', header: t('registrations.organizer'), hideOnMobile: true, cell: (e) => person(e.organizer) },
    { key: 'startsAt', header: t('registrations.startsAt'), cell: (e) => when(e.startsAt) },
    { key: 'seats', header: t('registrations.seats'), cell: (e) => `${formatNumber(e.seatsTaken, locale)} / ${formatNumber(e.capacity, locale)}` },
    { key: 'status', header: t('registrations.status'), hideOnMobile: true, cell: (e) => <Badge tone={eventStatusTone[e.status as keyof typeof eventStatusTone] ?? 'neutral'}>{t(`enums:EventStatus.${e.status}`)}</Badge> },
    { key: 'price', header: t('registrations.price'), hideOnMobile: true, cell: (e) => (e.priceCredits === 0 ? t('free') : formatCredits(e.priceCredits, locale)) },
  ];
  const exportEvents = () =>
    downloadCsv(
      fileName('inscripciones'),
      [t('registrations.event'), t('registrations.organizer'), t('registrations.startsAt'), t('registrations.confirmed'), t('registrations.capacity'), t('registrations.price')],
      eventList.map((e) => [e.title, person(e.organizer), e.startsAt, e.seatsTaken, e.capacity, e.priceCredits]),
    );

  // ---- SAGAs -----------------------------------------------------------------------------------------------------
  const sagaList = sagaRows.data?.sagas ?? [];
  const sagaByStatus = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of sagaRows.data?.sagas ?? []) m.set(x.status, (m.get(x.status) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [sagaRows.data]);
  const sagaByDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of sagaRows.data?.sagas ?? []) m.set(x.startedAt.slice(0, 10), (m.get(x.startedAt.slice(0, 10)) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, value]) => ({ date, value }));
  }, [sagaRows.data]);
  const sagaCount = (...st: string[]) => sagaList.filter((x) => st.includes(x.status)).length;
  const minutes = (x: SagaReportRow) => {
    const m = (new Date(x.updatedAt).getTime() - new Date(x.startedAt).getTime()) / 60000;
    return m < 1 ? t('sagas.underMinute') : t('sagas.minutes', { count: Math.round(m) });
  };
  const sagaColumns: Column<SagaReportRow>[] = [
    { key: 'type', header: t('sagas.type'), cell: (x) => t(`enums:SagaType.${x.type}`) },
    { key: 'status', header: t('sagas.status'), cell: (x) => <Badge tone={sagaTone[x.status as keyof typeof sagaTone] ?? 'neutral'}>{t(`enums:SagaStatus.${x.status}`)}</Badge> },
    { key: 'step', header: t('sagas.step'), hideOnMobile: true, cell: (x) => t(`enums:SagaStep.${x.step}`) },
    { key: 'failure', header: t('sagas.failure'), hideOnMobile: true, cell: (x) => (x.failureReason ? t(`enums:RegistrationFailureReason.${x.failureReason}`) : t('noValue')) },
    { key: 'retries', header: t('sagas.retries'), hideOnMobile: true, cell: (x) => x.retries },
    { key: 'startedAt', header: t('sagas.startedAt'), cell: (x) => when(x.startedAt) },
    { key: 'duration', header: t('sagas.duration'), cell: (x) => minutes(x) },
  ];
  const exportSagas = () =>
    downloadCsv(
      fileName('sagas'),
      [t('sagas.type'), t('sagas.status'), t('sagas.step'), t('sagas.failure'), t('sagas.retries'), t('sagas.startedAt'), t('sagas.updatedAt')],
      sagaList.map((x) => [x.type, x.status, x.step, x.failureReason ?? '', x.retries, x.startedAt, x.updatedAt]),
    );

  // ---- Créditos --------------------------------------------------------------------------------------------------
  const w = wallet.data?.walletStats;
  const creditColumns: Column<CreditPoint>[] = [
    { key: 'date', header: t('credits.date'), cell: (p) => p.date },
    { key: 'topUp', header: t('credits.topUp'), cell: (p) => formatCredits(p.topUpCredits, locale) },
    { key: 'debit', header: t('credits.debit'), cell: (p) => formatCredits(p.debitCredits, locale) },
    { key: 'refund', header: t('credits.refund'), cell: (p) => formatCredits(p.refundCredits, locale) },
  ];
  const exportCredits = () =>
    downloadCsv(fileName('creditos'), [t('credits.date'), t('credits.topUp'), t('credits.debit'), t('credits.refund')], (w?.series ?? []).map((p) => [p.date, p.topUpCredits, p.debitCredits, p.refundCredits]));

  const exporters: Record<ReportId, { run: () => void; disabled: boolean }> = {
    attendance: { run: exportAttendance, disabled: attendance.length === 0 },
    registrations: { run: exportEvents, disabled: eventList.length === 0 },
    sagas: { run: exportSagas, disabled: sagaList.length === 0 },
    credits: { run: exportCredits, disabled: !w || w.series.length === 0 },
  };
  const loading = report === 'attendance' ? validations.fetching : report === 'registrations' ? eventRows.fetching || totals.fetching : report === 'sagas' ? sagaRows.fetching : wallet.fetching;

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <>
            <Button variant="secondary" onClick={exporters[report].run} disabled={exporters[report].disabled}>
              <Download aria-hidden className="size-4" />
              {t('exportCsv')}
            </Button>
            <RefreshButton loading={loading} onRefresh={refresh} />
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div role="tablist" aria-label={t('title')} className="inline-flex rounded-md border border-default bg-surface-muted p-0.5">
          {REPORTS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={report === id}
              onClick={() => setReport(id)}
              className={cn(
                'min-h-10 rounded px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-focus md:min-h-8',
                report === id ? 'bg-action-primary text-action-primary-fg' : 'text-secondary hover:text-primary',
              )}
            >
              {t(`tabs.${id}`)}
            </button>
          ))}
        </div>
        <Field label={t('range.label')} className="min-w-44">
          {({ id }) => (
            <Select id={id} value={days} onChange={(e) => setDays(Number(e.target.value) as (typeof RANGES)[number])}>
              {RANGES.map((r) => (
                <option key={r} value={r}>
                  {t('range.lastDays', { count: r })}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {report === 'registrations' && (
          <Field label={t('registrations.whenFilter')} className="min-w-44">
            {({ id }) => (
              <Select id={id} value={when2} onChange={(e) => setWhen2(e.target.value as (typeof WHEN)[number])}>
                {WHEN.map((w) => (
                  <option key={w} value={w}>
                    {t(`registrations.when.${w}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        {report === 'attendance' && (
          <Field label={t('attendance.eventFilter')} className="min-w-56">
            {({ id }) => (
              <Select id={id} value={eventId} onChange={(e) => setEventId(e.target.value)}>
                <option value="">{t('attendance.allEvents')}</option>
                {(events.data?.events ?? []).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
      </div>

      {report === 'attendance' && (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label={t('attendance.total')} value={formatNumber(attendance.length, locale)} />
            <Stat label={t('attendance.events')} value={formatNumber(new Set(attendance.map((v) => v.eventId)).size, locale)} />
            <Stat label={t('attendance.organizers')} value={formatNumber(new Set(attendance.map((v) => v.validatedBy?.id)).size, locale)} />
          </div>
          {attendanceByEvent.length > 0 && (
            <Card className="mb-4">
              <CardHeader title={t('attendance.chartTitle')} description={t('attendance.chartDescription')} />
              <CardBody>
                <BarChart
                  locale={locale}
                  title={t('attendance.chartTitle')}
                  series={[
                    { name: 'enrolled', label: t('attendance.enrolled'), color: 2 },
                    { name: 'scanned', label: t('attendance.scanned'), color: 1 },
                  ]}
                  categories={attendanceByEvent.map((r) => ({ label: r.title, values: [r.enrolled, r.scanned] }))}
                />
              </CardBody>
            </Card>
          )}
          <Card className="mb-4">
            <CardHeader title={t('attendance.byEventTitle')} description={t('attendance.byEventDescription')} />
            <DataTable
              caption={t('attendance.byEventTitle')}
              columns={byEventColumns}
              rows={attendanceByEvent}
              getRowId={(r) => r.id}
              loading={validations.fetching || eventRows.fetching}
              empty={<EmptyState icon={FileText} title={t('attendance.empty')} />}
            />
          </Card>
          <Card>
            <CardHeader title={t('attendance.title')} description={validations.data?.ticketValidations.truncated ? t('truncated') : t('attendance.description')} />
            {validations.error && !validations.data ? (
              <ErrorState error={validations.error} onRetry={refresh} />
            ) : (
              <DataTable
                caption={t('attendance.title')}
                columns={attendanceColumns}
                rows={attendance}
                getRowId={(v) => v.ticketId}
                loading={validations.fetching}
                empty={<EmptyState icon={FileText} title={t('attendance.empty')} />}
              />
            )}
          </Card>
        </>
      )}

      {report === 'registrations' && (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label={t('registrations.confirmed')} value={formatNumber(totals.data?.dashboard.registrationsConfirmed ?? 0, locale)} />
            <Stat label={t('registrations.failed')} value={formatNumber(totals.data?.dashboard.registrationsFailed ?? 0, locale)} />
            <Stat label={t('registrations.cancelled')} value={formatNumber(totals.data?.dashboard.registrationsCancelled ?? 0, locale)} />
          </div>
          {eventList.length > 0 && (
            <Card className="mb-4">
              <CardHeader title={t('registrations.chartTitle')} description={t('registrations.chartDescription')} />
              <CardBody>
                <BarChart
                  locale={locale}
                  title={t('registrations.chartTitle')}
                  series={[
                    { name: 'capacity', label: t('registrations.capacity'), color: 8 },
                    { name: 'seats', label: t('registrations.seats'), color: 1 },
                  ]}
                  categories={[...eventList].sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(-12).map((e) => ({ label: e.title, values: [e.capacity, e.seatsTaken] }))}
                />
              </CardBody>
            </Card>
          )}
          <Card>
            <CardHeader title={t('registrations.title')} description={t('registrations.description')} />
            {eventRows.error && !eventRows.data ? (
              <ErrorState error={eventRows.error} onRetry={refresh} />
            ) : (
              <DataTable
                caption={t('registrations.title')}
                columns={eventColumns}
                rows={eventList}
                getRowId={(e) => e.id}
                loading={eventRows.fetching}
                empty={<EmptyState icon={FileText} title={t('registrations.empty')} />}
              />
            )}
          </Card>
        </>
      )}

      {report === 'sagas' && (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label={t('sagas.completed')} value={formatNumber(sagaCount('COMPLETED'), locale)} />
            <Stat label={t('sagas.compensated')} value={formatNumber(sagaCount('COMPENSATED'), locale)} />
            <Stat label={t('sagas.failed')} value={formatNumber(sagaCount('FAILED'), locale)} />
            <Stat label={t('sagas.inProgress')} value={formatNumber(sagaCount('STARTED', 'AWAITING_DEBIT', 'AWAITING_TICKET', 'COMPENSATING'), locale)} />
          </div>
          {sagaList.length > 0 && (
            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader title={t('sagas.byStatusTitle')} />
                <CardBody>
                  <BarChart
                    locale={locale}
                    title={t('sagas.byStatusTitle')}
                    series={[{ name: 'count', label: t('sagas.count'), color: 1 }]}
                    categories={sagaByStatus.map(([st, n]) => ({ label: t(`enums:SagaStatus.${st}`), values: [n] }))}
                  />
                </CardBody>
              </Card>
              <Card>
                <CardHeader title={t('sagas.byDayTitle')} />
                <CardBody>
                  <LineChart locale={locale} title={t('sagas.byDayTitle')} series={[{ name: 'registrationsConfirmed', label: t('sagas.count'), points: sagaByDay }]} />
                </CardBody>
              </Card>
            </div>
          )}
          <Card>
            <CardHeader title={t('sagas.title')} description={sagaList.length >= 50 ? t('truncated') : t('sagas.description')} />
            {sagaRows.error && !sagaRows.data ? (
              <ErrorState error={sagaRows.error} onRetry={refresh} />
            ) : (
              <DataTable
                caption={t('sagas.title')}
                columns={sagaColumns}
                rows={sagaList}
                getRowId={(x) => x.id}
                loading={sagaRows.fetching}
                empty={<EmptyState icon={FileText} title={t('sagas.empty')} />}
              />
            )}
          </Card>
        </>
      )}

      {report === 'credits' && (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label={t('credits.topUp')} value={formatCredits(w?.topUpCredits ?? 0, locale)} />
            <Stat label={t('credits.debit')} value={formatCredits(w?.debitCredits ?? 0, locale)} />
            <Stat label={t('credits.refund')} value={formatCredits(w?.refundCredits ?? 0, locale)} />
            <Stat label={t('credits.net')} value={formatCredits(w?.netCredits ?? 0, locale)} />
          </div>
          {(w?.series.length ?? 0) > 0 && (
            <Card className="mb-4">
              <CardHeader title={t('credits.chartTitle')} description={t('credits.chartDescription')} />
              <CardBody>
                <LineChart
                  locale={locale}
                  title={t('credits.chartTitle')}
                  format={(v) => formatCredits(v, locale)}
                  series={[
                    { name: 'creditsToppedUp', label: t('credits.topUp'), points: (w?.series ?? []).map((p) => ({ date: p.date, value: p.topUpCredits })) },
                    { name: 'creditsSpent', label: t('credits.debit'), points: (w?.series ?? []).map((p) => ({ date: p.date, value: p.debitCredits })) },
                    { name: 'creditsRefunded', label: t('credits.refund'), points: (w?.series ?? []).map((p) => ({ date: p.date, value: p.refundCredits })) },
                  ]}
                />
              </CardBody>
            </Card>
          )}
          <Card>
            <CardHeader title={t('credits.title')} description={t('credits.description')} />
            {wallet.error && !wallet.data ? (
              <ErrorState error={wallet.error} onRetry={refresh} />
            ) : (
              <DataTable
                caption={t('credits.title')}
                columns={creditColumns}
                rows={w?.series ?? []}
                getRowId={(p) => p.date}
                loading={wallet.fetching}
                empty={<EmptyState icon={FileText} title={t('credits.empty')} />}
              />
            )}
          </Card>
        </>
      )}
    </>
  );
}
