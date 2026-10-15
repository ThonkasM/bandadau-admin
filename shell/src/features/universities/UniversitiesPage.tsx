'use client';

import { formatDate } from '@bandada/i18n';
import { GraduationCap, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from 'urql';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { type Column, DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from '@/components/ui/Toast';
import { useLocale } from '@/lib/format';
import { useErrorText } from '@/lib/graphql/errors';

import { CREATE_UNIVERSITY, UNIVERSITIES_QUERY, type UniversityRow } from './graphql';

const DOMAIN_PATTERN = /^(?=.{3,253}$)([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;

/** Un dominio por línea o separados por coma/espacio; en minúsculas y sin duplicados. */
export function parseDomains(raw: string): string[] {
  return Array.from(new Set(raw.split(/[\s,;]+/).map((d) => d.trim().toLowerCase().replace(/^@/, '')).filter(Boolean)));
}

export default function UniversitiesPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const errorText = useErrorText();
  const [result, refetch] = useQuery({ query: UNIVERSITIES_QUERY });
  const [createState, create] = useMutation(CREATE_UNIVERSITY);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [domains, setDomains] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [domainsError, setDomainsError] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setName('');
    setDomains('');
    setNameError(null);
    setDomainsError(null);
  };

  const submit = async () => {
    const list = parseDomains(domains);
    const nErr = name.trim() ? null : t('universities:form.nameRequired');
    const dErr = list.length === 0 ? t('universities:form.domainsRequired') : list.some((d) => !DOMAIN_PATTERN.test(d)) ? t('universities:form.domainsInvalid') : null;
    setNameError(nErr);
    setDomainsError(dErr);
    if (nErr || dErr) return;
    const res = await create({ input: { name: name.trim(), allowedDomains: list } });
    const errors = res.data?.createUniversity.errors ?? [];
    if (res.error || errors.length > 0) {
      setDomainsError(errorText(res.error ?? errors[0]?.code));
      return;
    }
    toast.success(t('universities:created'));
    close();
  };

  const columns: Column<UniversityRow>[] = [
    { key: 'name', header: t('universities:columns.name'), cell: (u) => <span className="font-medium">{u.name}</span> },
    {
      key: 'domains',
      header: t('universities:columns.domains'),
      cell: (u) => (
        <span className="flex flex-wrap gap-1">
          {u.allowedDomains.map((d) => (
            <Badge key={d} className="font-mono">
              {d}
            </Badge>
          ))}
        </span>
      ),
    },
    {
      key: 'enabled',
      header: t('universities:columns.enabled'),
      cell: (u) => <Badge tone={u.enabled ? 'success' : 'neutral'}>{u.enabled ? t('universities:enabled') : t('universities:disabled')}</Badge>,
    },
    { key: 'createdAt', header: t('universities:columns.createdAt'), hideOnMobile: true, cell: (u) => formatDate(u.createdAt, locale) },
    {
      key: 'actions',
      header: <span className="sr-only">{t('universities:columns.actions')}</span>,
      className: 'text-end',
      cell: (u) => (
        // `updateUniversity` aún no existe en contracts/graphql/admin.graphql (contract-first): edición deshabilitada.
        <Button variant="ghost" size="sm" disabled title={t('universities:editPending')} aria-label={t('universities:editAria', { name: u.name })}>
          <Pencil aria-hidden className="size-4" />
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('universities:title')}
        description={t('universities:description')}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus aria-hidden className="size-4" />
            {t('universities:create')}
          </Button>
        }
      />
      <Card>
        {result.error && !result.data ? (
          <ErrorState error={result.error} onRetry={() => refetch({ requestPolicy: 'network-only' })} />
        ) : (
          <DataTable
            caption={t('universities:tableCaption')}
            columns={columns}
            rows={result.data?.universities ?? []}
            getRowId={(u) => u.id}
            loading={result.fetching}
            empty={<EmptyState icon={GraduationCap} title={t('universities:empty')} />}
          />
        )}
      </Card>
      <p className="mt-3 text-xs text-muted">{t('universities:editPending')}</p>

      <Modal
        open={open}
        title={t('universities:form.title')}
        onClose={close}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={submit} loading={createState.fetching}>
              {t('common:actions.save')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label={t('universities:form.name')} required error={nameError}>
            {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} value={name} onChange={(e) => setName(e.target.value)} autoFocus />}
          </Field>
          <Field label={t('universities:form.domains')} hint={t('universities:form.domainsHint')} required error={domainsError}>
            {({ id, describedBy, invalid }) => (
              <Textarea id={id} aria-describedby={describedBy} invalid={invalid} value={domains} placeholder={t('universities:form.domainsPlaceholder')} onChange={(e) => setDomains(e.target.value)} />
            )}
          </Field>
        </div>
      </Modal>
    </>
  );
}
