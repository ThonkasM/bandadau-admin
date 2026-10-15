'use client';

import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { bootstrapSession, loginWithHandoff, logout } from '@/lib/auth/session';
import { useSession } from '@/lib/auth/session-store';
import { takeHandoffParams } from '@/lib/auth/sso';
import { homeFor } from '@/lib/auth/types';
import { codeOf, useErrorText } from '@/lib/graphql/errors';

type Phase = 'exchanging' | 'success' | 'error';
const REDIRECT_DELAY_MS = 2500;

/**
 * UC-03 / P-ADM-02: lee `code` (query) y `cv` (fragmento), limpia la URL y canjea con `exchangeHandoffCode`.
 * Tras el éxito muestra "Sesión iniciada como …" con "No soy yo" (mitigación de login CSRF, seguridad-y-sso.md §7.4).
 */
export default function SsoCallbackPage() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const router = useRouter();
  const user = useSession((s) => s.user);
  const [phase, setPhase] = useState<Phase>('exchanging');
  const [errorCode, setErrorCode] = useState<string>('HANDOFF_CODE_INVALID');
  const started = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    // El código es de un solo uso: el guard evita el doble efecto de StrictMode.
    if (started.current) return;
    started.current = true;

    void (async () => {
      const { code, verifier } = takeHandoffParams();
      if (!code || !verifier) {
        // Recarga del callback ya consumido (UC-03 10b): si hay sesión, sigue al panel.
        await bootstrapSession();
        const state = useSession.getState();
        if (state.status === 'authenticated') router.replace(homeFor(state.user));
        else {
          setErrorCode('HANDOFF_CODE_INVALID');
          setPhase('error');
        }
        return;
      }
      try {
        const tokens = await loginWithHandoff(code, verifier);
        setPhase('success');
        timer.current = setTimeout(() => router.replace(homeFor(tokens.user)), REDIRECT_DELAY_MS);
      } catch (error) {
        setErrorCode(codeOf(error));
        setPhase('error');
      }
    })();
    return () => undefined;
  }, [router]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const notMe = async () => {
    clearTimeout(timer.current);
    await logout();
    router.replace('/login/');
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-md rounded-xl border border-default bg-surface p-8 text-center shadow-md" aria-live="polite">
        {phase === 'exchanging' && (
          <div role="status" className="flex flex-col items-center gap-3">
            <Loader2 aria-hidden className="size-8 animate-spin text-action-primary motion-reduce:animate-none" />
            <h1 className="font-display text-lg font-semibold text-primary">{t('auth:sso.exchanging')}</h1>
          </div>
        )}
        {phase === 'success' && (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 aria-hidden className="size-8 text-feedback-success-fg" />
            <h1 className="font-display text-lg font-semibold text-primary">{t('auth:sso.success', { email: user?.email ?? '' })}</h1>
            <p className="text-sm text-muted">{t('auth:sso.redirecting')}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                onClick={() => {
                  clearTimeout(timer.current);
                  router.replace(homeFor(user));
                }}
              >
                {t('common:actions.continue')}
              </Button>
              <Button variant="secondary" onClick={notMe}>
                {t('auth:sso.notMe')}
              </Button>
            </div>
          </div>
        )}
        {phase === 'error' && (
          <div role="alert" className="flex flex-col items-center gap-3">
            <AlertTriangle aria-hidden className="size-8 text-feedback-danger-fg" />
            <h1 className="font-display text-lg font-semibold text-primary">{t('auth:sso.failedTitle')}</h1>
            <p className="text-sm text-muted">{errorCode === 'HANDOFF_CODE_INVALID' ? t('auth:sso.invalid') : errorText(errorCode)}</p>
            <Button onClick={() => router.replace('/login/')}>{t('common:actions.signIn')}</Button>
          </div>
        )}
      </div>
    </main>
  );
}
