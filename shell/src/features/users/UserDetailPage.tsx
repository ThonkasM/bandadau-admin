'use client';

import type { Role } from '@bandada/contracts-ts/graphql/admin';
import { formatDateTime } from '@bandada/i18n';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from 'urql';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Checkbox, Field, Input, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { useSession } from '@/lib/auth/session-store';
import { hasAnyRole } from '@/lib/auth/types';
import { useLocale } from '@/lib/format';
import { useErrorText } from '@/lib/graphql/errors';
import { userStatusTone } from '@/lib/status';

import { ALL_ROLES, REACTIVATE_USER, SUSPEND_USER, UPDATE_USER_ROLES, USER_QUERY, type UserRow } from './graphql';

function Definition({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm text-primary">{children}</dd>
    </div>
  );
}

export default function UserDetailPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const errorText = useErrorText();
  const id = useSearchParams().get('id') ?? '';
  const me = useSession((s) => s.user);
  const isAdmin = hasAnyRole(me, ['ADMIN']);
  const isSelf = me?.id === id;

  const [result, refetch] = useQuery({ query: USER_QUERY, variables: { id }, pause: !id });
  const user: UserRow | null | undefined = result.data?.user;

  const [edited, setEdited] = useState<Role[] | null>(null);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [until, setUntil] = useState('');
  const [note, setNote] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  const [rolesState, updateRoles] = useMutation(UPDATE_USER_ROLES);
  const [suspendState, suspend] = useMutation(SUSPEND_USER);
  const [reactivateState, reactivate] = useMutation(REACTIVATE_USER);

  if (!id) return <EmptyState title={t('users:detail.notFound')} />;
  if (result.fetching && !user) return <Skeleton className="h-96 w-full" />;
  if (result.error && !user) return <Card><ErrorState error={result.error} onRetry={() => refetch({ requestPolicy: 'network-only' })} /></Card>;
  if (!user) return <Card><EmptyState title={t('users:detail.notFound')} /></Card>;

  const roles = edited ?? user.roles;
  const rolesChanged = roles.length !== user.roles.length || roles.some((r) => !user.roles.includes(r));

  const toggleRole = (role: Role, checked: boolean) => {
    setRolesError(null);
    setEdited((current) => {
      const base = current ?? user.roles;
      return checked ? [...base, role] : base.filter((r) => r !== role);
    });
  };

  const saveRoles = async () => {
    setRolesError(null);
    const res = await updateRoles({ input: { userId: user.id, roles } });
    const errors = res.data?.updateUserRoles.errors ?? [];
    if (res.error || errors.length > 0) {
      setRolesError(errorText(res.error ?? errors[0]?.code));
      return;
    }
    setEdited(null);
    toast.success(t('users:detail.rolesUpdated'));
  };

  const confirmSuspend = async () => {
    if (!reason.trim()) {
      setReasonError(t('users:suspend.reasonRequired'));
      return;
    }
    const res = await suspend({ input: { userId: user.id, reason: reason.trim(), until: until ? new Date(`${until}T23:59:59Z`).toISOString() : null } });
    const errors = res.data?.suspendUser.errors ?? [];
    if (res.error || errors.length > 0) {
      setReasonError(errorText(res.error ?? errors[0]?.code));
      return;
    }
    toast.success(t('users:suspend.done'));
    setSuspendOpen(false);
    setReason('');
    setUntil('');
  };

  const confirmReactivate = async () => {
    const res = await reactivate({ input: { userId: user.id, note: note.trim() || null } });
    const errors = res.data?.reactivateUser.errors ?? [];
    if (res.error || errors.length > 0) {
      toast.error(errorText(res.error ?? errors[0]?.code));
      return;
    }
    toast.success(t('users:reactivate.done'));
    setReactivateOpen(false);
    setNote('');
  };

  return (
    <>
      <Link href="/users/" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-link hover:underline focus-visible:outline-2 focus-visible:outline-focus">
        <ArrowLeft aria-hidden className="size-4 rtl:rotate-180" />
        {t('users:detail.back')}
      </Link>
      <PageHeader
        title={user.displayName ?? user.email}
        description={user.email}
        actions={
          isAdmin && !isSelf ? (
            user.status === 'SUSPENDED' ? (
              <Button variant="secondary" onClick={() => setReactivateOpen(true)}>
                {t('users:reactivate.action')}
              </Button>
            ) : (
              <Button variant="danger" onClick={() => setSuspendOpen(true)} disabled={user.status === 'DELETED'}>
                {t('users:suspend.action')}
              </Button>
            )
          ) : undefined
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t('users:detail.account')} action={<Badge tone={userStatusTone[user.status]}>{t(`enums:UserStatus.${user.status}`)}</Badge>} />
          <CardBody>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Definition label={t('users:columns.university')}>{user.university?.name ?? t('users:noUniversity')}</Definition>
              <Definition label={t('users:detail.createdAt')}>{formatDateTime(user.createdAt, locale)}</Definition>
              <Definition label={t('users:detail.verifiedAt')}>{user.emailVerifiedAt ? formatDateTime(user.emailVerifiedAt, locale) : t('users:detail.notVerified')}</Definition>
              <Definition label={t('users:detail.career')}>{user.career ?? t('users:noValue')}</Definition>
              {/* RN-21.5: idioma y tema son preferencias del usuario: solo lectura. */}
              <Definition label={t('users:detail.locale')}>{t(`shell:localeName.${user.locale}`)}</Definition>
              <Definition label={t('users:detail.theme')}>{t(`shell:theme.${user.theme}`)}</Definition>
              {user.status === 'SUSPENDED' && (
                <div className="sm:col-span-2">
                  <Definition label={t('users:detail.suspension')}>
                    {user.suspendedAt ? formatDateTime(user.suspendedAt, locale) : ''} {user.suspensionReason ?? ''}
                  </Definition>
                </div>
              )}
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t('users:detail.rolesTitle')} description={isAdmin ? t('users:detail.rolesHint') : t('users:detail.rolesReadOnly')} />
          <CardBody>
            <fieldset className="flex flex-col gap-1" disabled={!isAdmin}>
              <legend className="sr-only">{t('users:detail.rolesTitle')}</legend>
              {ALL_ROLES.map((role) => {
                const locked = role === 'STUDENT' || (isSelf && role === 'ADMIN');
                return (
                  <Checkbox
                    key={role}
                    label={t(`enums:Role.${role}`)}
                    checked={roles.includes(role)}
                    disabled={locked || !isAdmin}
                    onChange={(e) => toggleRole(role, e.target.checked)}
                  />
                );
              })}
            </fieldset>
            <p className="mt-2 text-xs text-muted">{t('users:detail.rolesRules')}</p>
            {rolesError && (
              <p role="alert" className="mt-3 text-sm font-medium text-feedback-danger-fg">
                {rolesError}
              </p>
            )}
            {isAdmin && (
              <div className="mt-4">
                <Button onClick={saveRoles} loading={rolesState.fetching} disabled={!rolesChanged}>
                  {t('users:detail.saveRoles')}
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal
        open={suspendOpen}
        title={t('users:suspend.title', { email: user.email })}
        onClose={() => setSuspendOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSuspendOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmSuspend} loading={suspendState.fetching}>
              {t('users:suspend.confirm')}
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-secondary">{t('users:suspend.warning')}</p>
        <div className="flex flex-col gap-4">
          <Field label={t('users:suspend.reason')} required error={reasonError}>
            {({ id: fid, describedBy, invalid }) => (
              <Textarea id={fid} aria-describedby={describedBy} invalid={invalid} value={reason} onChange={(e) => { setReason(e.target.value); setReasonError(null); }} />
            )}
          </Field>
          <Field label={t('users:suspend.until')} hint={t('users:suspend.untilHint')}>
            {({ id: fid }) => <Input id={fid} type="date" value={until} onChange={(e) => setUntil(e.target.value)} />}
          </Field>
        </div>
      </Modal>

      <Modal
        open={reactivateOpen}
        title={t('users:reactivate.title', { email: user.email })}
        onClose={() => setReactivateOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReactivateOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={confirmReactivate} loading={reactivateState.fetching}>
              {t('users:reactivate.confirm')}
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-secondary">{t('users:reactivate.warning')}</p>
        <Field label={t('users:reactivate.note')}>{({ id: fid }) => <Textarea id={fid} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
      </Modal>
    </>
  );
}
