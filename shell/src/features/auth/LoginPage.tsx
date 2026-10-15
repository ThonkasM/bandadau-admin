'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { bootstrapSession, login } from '@/lib/auth/session';
import { useSession } from '@/lib/auth/session-store';
import { hasPanelAccess, homeFor } from '@/lib/auth/types';
import { useErrorText } from '@/lib/graphql/errors';

/** Solo se aceptan rutas internas en `?next=` (evita open redirect). */
export function safeNext(raw: string | null): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw;
}

export default function LoginPage() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const router = useRouter();
  const status = useSession((s) => s.status);
  const user = useSession((s) => s.user);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  // Si la cookie de refresh sigue vigente, entra sin pedir credenciales.
  useEffect(() => {
    void bootstrapSession();
  }, []);
  useEffect(() => {
    if (status === 'authenticated' && hasPanelAccess(user)) router.replace(homeFor(user));
  }, [status, user, router]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = t('auth:login.emailInvalid');
    if (!password) next.password = t('auth:login.passwordRequired');
    setErrors(next);
    if (next.email || next.password) return;
    setSubmitting(true);
    try {
      const tokens = await login(email.trim(), password);
      const target = safeNext(new URLSearchParams(window.location.search).get('next'));
      if (hasPanelAccess(tokens.user)) router.replace(target ?? homeFor(tokens.user));
      else router.replace('/');
    } catch (error) {
      setErrors({ form: errorText(error) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-canvas">
      <div className="flex items-center justify-end gap-2 p-4">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-default bg-surface p-6 shadow-md sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mark.svg" alt="" width={44} height={44} className="size-11" />
            <div>
              <h1 className="font-display text-xl font-bold text-primary">{t('auth:login.title')}</h1>
              <p className="text-sm text-muted">{t('auth:login.subtitle')}</p>
            </div>
          </div>

          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            {errors.form && (
              <div role="alert" className="rounded-md border border-feedback-danger-border bg-feedback-danger px-3 py-2 text-sm font-medium text-feedback-danger-fg">
                {errors.form}
              </div>
            )}
            <Field label={t('auth:login.email')} required error={errors.email}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} type="email" autoComplete="username" inputMode="email" aria-describedby={describedBy} invalid={invalid} value={email} onChange={(e) => setEmail(e.target.value)} />
              )}
            </Field>
            <Field label={t('auth:login.password')} required error={errors.password}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} type="password" autoComplete="current-password" aria-describedby={describedBy} invalid={invalid} value={password} onChange={(e) => setPassword(e.target.value)} />
              )}
            </Field>
            <Button type="submit" loading={submitting} className="w-full">
              {t('auth:login.submit')}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">{t('auth:login.appHint')}</p>
        </div>
      </div>
    </main>
  );
}
