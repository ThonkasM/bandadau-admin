'use client';

import { formatCredits, formatNumber, formatRelative } from '@bandada/i18n';
import { Activity, AlertTriangle, CalendarCheck, Coins, FileText, Flag, MessageSquare, UserPlus, Users } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useSubscription } from 'urql';

import { LineChart } from '@/components/charts/LineChart';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Field, Select } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { daysAgo, isoDate, useLocale } from '@/lib/format';
import { codeOf } from '@/lib/graphql/errors';
import { serviceStatusTone, severityTone } from '@/lib/status';

import { ALERT_RAISED_SUBSCRIPTION, DASHBOARD_QUERY, OPEN_ALERTS_QUERY, SERVICE_HEALTH_QUERY } from './graphql';

const RANGES = [7, 30, 90] as const;

function StatCard({ icon: Icon, label, value, loading }: { icon: typeof Users; label: string; value: ReactNode; loading: boolean }) {
  return (
    <Card>
      <CardBody className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-feedback-info text-feedback-info-fg">
          <Icon aria-hidden className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted">{label}</p>
          {loading ? <Skeleton className="mt-1 h-7 w-20" /> : <p className="font-display text-2xl font-bold text-primary">{value}</p>}
        </div>
      </CardBody>
    </Card>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const [days, setDays] = useState<(typeof RANGES)[number]>(7);

  const range = useMemo(() => ({ from: isoDate(daysAgo(days - 1)), to: isoDate(new Date()), bucket: 'DAY' as const }), [days]);
  const [dash, refetchDash] = useQuery({ query: DASHBOARD_QUERY, variables: { range } });
  const [health, refetchHealth] = useQuery({ query: SERVICE_HEALTH_QUERY });
  const [alerts, refetchAlerts] = useQuery({ query: OPEN_ALERTS_QUERY });
  const [live] = useSubscription({ query: ALERT_RAISED_SUBSCRIPTION });

  // `alertRaised` (graphql-ws): aviso en vivo + refresco de la lista (entrega at-most-once; el refetch corrige).
  useEffect(() => {
    if (!live.data) return;
    toast.info(t('dashboard:alerts.raised', { message: live.data.alertRaised.message }));
    refetchAlerts({ requestPolicy: 'network-only' });
    refetchDash({ requestPolicy: 'network-only' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.data]);

  const d = dash.data?.dashboard;
  const loading = dash.fetching && !d;
  const services = health.data?.serviceHealth;
  const upCount = services?.services.filter((s) => s.status === 'UP').length ?? 0;

  const allSeries = (d?.series ?? []).map((s) => ({
    name: s.name,
    label: t(`dashboard:series.${s.name}`, { defaultValue: s.name }),
    points: s.points,
  }));
  // Los créditos tienen otra escala que los conteos: van en su propio gráfico.
  const series = allSeries.filter((s) => !s.name.startsWith('credits'));
  const creditSeries = allSeries.filter((s) => s.name.startsWith('credits'));
  // Fase 1: las alertas son de insights y el gateway responde FEATURE_DISABLED (no es un fallo).
  const alertsDisabled = !!alerts.error && codeOf(alerts.error) === 'FEATURE_DISABLED';

  return (
    <>
      <PageHeader
        title={t('dashboard:title')}
        description={t('dashboard:description')}
        actions={
          <Field label={t('dashboard:range.label')} className="min-w-44">
            {({ id }) => (
              <Select id={id} value={days} onChange={(e) => setDays(Number(e.target.value) as (typeof RANGES)[number])}>
                {RANGES.map((r) => (
                  <option key={r} value={r}>
                    {t('dashboard:range.lastDays', { count: r })}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        }
      />

      {dash.error && !d ? (
        <Card>
          <ErrorState error={dash.error} onRetry={() => refetchDash({ requestPolicy: 'network-only' })} />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Users} label={t('dashboard:cards.activeUsers')} value={formatNumber(d?.activeUsers ?? 0, locale)} loading={loading} />
          <StatCard icon={UserPlus} label={t('dashboard:cards.newUsers')} value={formatNumber(d?.newUsers ?? 0, locale)} loading={loading} />
          <StatCard icon={FileText} label={t('dashboard:cards.posts')} value={formatNumber(d?.posts ?? 0, locale)} loading={loading} />
          <StatCard icon={MessageSquare} label={t('dashboard:cards.comments')} value={formatNumber(d?.comments ?? 0, locale)} loading={loading} />
          <StatCard icon={CalendarCheck} label={t('dashboard:cards.registrations')} value={formatNumber(d?.registrationsConfirmed ?? 0, locale)} loading={loading} />
          <StatCard icon={Coins} label={t('dashboard:cards.creditsSpent')} value={formatCredits(d?.creditsSpent ?? 0, locale)} loading={loading} />
          <StatCard icon={Flag} label={t('dashboard:cards.flagged')} value={formatNumber(d?.flaggedContent ?? 0, locale)} loading={loading} />
          <StatCard icon={AlertTriangle} label={t('dashboard:cards.openAlerts')} value={formatNumber(d?.openAlerts ?? 0, locale)} loading={loading} />
        </div>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title={t('dashboard:chart.title')} description={t('dashboard:chart.description', { count: days })} />
          <CardBody>
            {loading ? (
              <Skeleton className="h-60 w-full" />
            ) : series.length === 0 ? (
              <EmptyState icon={Activity} title={t('dashboard:chart.empty')} />
            ) : (
              <div className="flex flex-col gap-6">
                <LineChart series={series} locale={locale} title={t('dashboard:chart.title')} />
                {creditSeries.length > 0 && <LineChart series={creditSeries} locale={locale} title={t('dashboard:chart.credits')} />}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={t('dashboard:health.title')}
            action={services && <Badge tone={serviceStatusTone[services.overall]}>{t(`enums:ServiceStatus.${services.overall}`)}</Badge>}
            description={services ? t('dashboard:health.summary', { up: upCount, total: services.services.length }) : undefined}
          />
          <CardBody>
            {health.fetching && !services ? (
              <Skeleton className="h-40 w-full" />
            ) : health.error && !services ? (
              <ErrorState error={health.error} onRetry={() => refetchHealth({ requestPolicy: 'network-only' })} />
            ) : (
              <ul className="flex flex-col gap-2">
                {services?.services.map((s) => (
                  <li key={s.name} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-medium text-primary">{s.name}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      {typeof s.latencyMs === 'number' && <span className="text-xs text-muted">{t('dashboard:health.latency', { ms: s.latencyMs })}</span>}
                      <Badge tone={serviceStatusTone[s.status]}>{t(`enums:ServiceStatus.${s.status}`)}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title={t('dashboard:alerts.title', { count: d?.openAlerts ?? 0 })}
            action={<span className="text-xs text-muted">{t('dashboard:alerts.insightsPhase2')}</span>}
          />
          <CardBody>
            {alertsDisabled ? (
              <EmptyState icon={Activity} title={t('dashboard:alerts.disabled')} />
            ) : alerts.fetching && !alerts.data ? (
              <Skeleton className="h-24 w-full" />
            ) : alerts.error && !alerts.data ? (
              <ErrorState error={alerts.error} onRetry={() => refetchAlerts({ requestPolicy: 'network-only' })} />
            ) : alerts.data?.alerts.length === 0 ? (
              <EmptyState icon={Activity} title={t('dashboard:alerts.empty')} />
            ) : (
              <ul className="flex flex-col gap-3">
                {alerts.data?.alerts.map((a) => (
                  <li key={a.id} className="flex items-start gap-3">
                    <Badge tone={severityTone[a.severity]}>{t(`enums:AlertSeverity.${a.severity}`)}</Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-primary">{a.message}</p>
                      <p className="text-xs text-muted">{t('dashboard:alerts.meta', { kind: t(`enums:AlertKind.${a.kind}`), when: formatRelative(a.raisedAt, locale) })}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t('dashboard:queues.title')} />
          <CardBody>
            {health.fetching && !services ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <ul className="flex flex-col gap-2">
                {services?.queues.map((q) => (
                  <li key={q.name} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-mono text-xs text-primary">{q.name}</span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-muted">
                      {t('dashboard:queues.ready', { count: q.messagesReady })}
                      {q.isDeadLetter && q.messagesReady > 0 && <Badge tone="danger">{t('dashboard:queues.dlq')}</Badge>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
