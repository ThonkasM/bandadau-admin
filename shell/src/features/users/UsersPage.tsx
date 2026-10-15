'use client';

import type { Role, UserStatus } from '@bandada/contracts-ts/graphql/admin';
import { Search, Users } from 'lucide-react';
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
import { Pagination } from '@/components/ui/Pagination';
import { useDebounced } from '@/hooks/useDebounced';
import { userStatusTone } from '@/lib/status';

import { UNIVERSITIES_QUERY } from '../universities/graphql';
import { ALL_ROLES, ALL_USER_STATUSES, type UserRow,USERS_QUERY } from './graphql';

const PAGE_SIZE = 20;

export default function UsersPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [status, setStatus] = useState<UserStatus | ''>('');
  const [universityId, setUniversityId] = useState('');
  const query = useDebounced(search.trim(), 300);

  // Paginación Relay por cursor: pila de `after` (la primera página es null).
  // Al cambiar los filtros la pila se descarta (se compara contra la clave de filtros, sin efectos).
  const filterKey = `${query}|${role}|${status}|${universityId}`;
  const [pager, setPager] = useState<{ key: string; cursors: Array<string | null> }>({ key: filterKey, cursors: [null] });
  const cursors = pager.key === filterKey ? pager.cursors : [null];
  const setCursors = (update: (current: Array<string | null>) => Array<string | null>) =>
    setPager({ key: filterKey, cursors: update(cursors) });
  const after = cursors[cursors.length - 1] ?? null;

  const [result, refetch] = useQuery({
    query: USERS_QUERY,
    variables: {
      first: PAGE_SIZE,
      after,
      filter: { query: query || null, role: role || null, status: status || null, universityId: universityId || null },
    },
    requestPolicy: 'cache-and-network',
  });
  const [unis] = useQuery({ query: UNIVERSITIES_QUERY });

  const rows = result.data?.users.edges.map((e) => e.node) ?? [];
  const pageInfo = result.data?.users.pageInfo;
  const hasFilters = !!(query || role || status || universityId);

  const columns: Column<UserRow>[] = [
    {
      key: 'name',
      header: t('users:columns.name'),
      cell: (u) => <span className="font-medium">{u.displayName ?? t('users:noName')}</span>,
    },
    { key: 'email', header: t('users:columns.email'), cell: (u) => <span className="break-all">{u.email}</span> },
    { key: 'university', header: t('users:columns.university'), hideOnMobile: true, cell: (u) => u.university?.name ?? t('users:noUniversity') },
    {
      key: 'roles',
      header: t('users:columns.roles'),
      cell: (u) => (
        <span className="flex flex-wrap gap-1">
          {u.roles.map((r) => (
            <Badge key={r} tone={r === 'ADMIN' || r === 'MODERATOR' ? 'info' : 'neutral'}>
              {t(`enums:Role.${r}`)}
            </Badge>
          ))}
        </span>
      ),
    },
    { key: 'status', header: t('users:columns.status'), cell: (u) => <Badge tone={userStatusTone[u.status]}>{t(`enums:UserStatus.${u.status}`)}</Badge> },
    {
      key: 'actions',
      header: <span className="sr-only">{t('users:columns.actions')}</span>,
      className: 'text-end',
      cell: (u) => (
        <Link
          href={`/users/detail/?id=${encodeURIComponent(u.id)}`}
          aria-label={t('users:manageAria', { email: u.email })}
          className="inline-flex min-h-9 items-center rounded-md px-3 text-sm font-semibold text-link hover:underline focus-visible:outline-2 focus-visible:outline-focus"
        >
          {t('users:manage')}
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t('users:title')} description={t('users:description')} />
      <Card>
        <div className="grid gap-3 border-b border-default p-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field label={t('users:filters.search')}>
            {({ id }) => (
              <div className="relative">
                <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <Input id={id} type="search" className="ps-9" value={search} placeholder={t('users:filters.searchPlaceholder')} onChange={(e) => setSearch(e.target.value)} />
              </div>
            )}
          </Field>
          <Field label={t('users:filters.role')}>
            {({ id }) => (
              <Select id={id} value={role} onChange={(e) => setRole(e.target.value as Role | '')}>
                <option value="">{t('users:filters.all')}</option>
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(`enums:Role.${r}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('users:filters.status')}>
            {({ id }) => (
              <Select id={id} value={status} onChange={(e) => setStatus(e.target.value as UserStatus | '')}>
                <option value="">{t('users:filters.all')}</option>
                {ALL_USER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`enums:UserStatus.${s}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('users:filters.university')}>
            {({ id }) => (
              <Select id={id} value={universityId} onChange={(e) => setUniversityId(e.target.value)}>
                <option value="">{t('users:filters.all')}</option>
                {unis.data?.universities.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        {result.error && !result.data ? (
          <ErrorState error={result.error} onRetry={() => refetch({ requestPolicy: 'network-only' })} />
        ) : (
          <>
            <DataTable
              caption={t('users:tableCaption')}
              columns={columns}
              rows={rows}
              getRowId={(u) => u.id}
              loading={result.fetching && rows.length === 0}
              empty={<EmptyState icon={Users} title={hasFilters ? t('users:empty.noMatch') : t('users:empty.none')} />}
            />
            <Pagination
              page={cursors.length}
              hasPrev={cursors.length > 1}
              hasNext={!!pageInfo?.hasNextPage}
              loading={result.fetching}
              onPrev={() => setCursors((c) => c.slice(0, -1))}
              onNext={() => pageInfo?.endCursor && setCursors((c) => [...c, pageInfo.endCursor ?? null])}
            />
          </>
        )}
      </Card>
    </>
  );
}
