'use client';

import { ShieldOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { logout } from '@/lib/auth/session';
import { useSession } from '@/lib/auth/session-store';

import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';

/** Sin rol MODERATOR/ADMIN (o sin el rol que exige la sección). */
export function AccessDenied({ variant = 'panel' }: { variant?: 'panel' | 'section' }) {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useSession((s) => s.user);
  const signOut = async () => {
    await logout();
    router.replace('/login/');
  };
  return (
    <div className={variant === 'panel' ? 'flex min-h-screen items-center justify-center bg-canvas p-6' : 'py-6'}>
      <div className="w-full max-w-lg rounded-lg border border-default bg-surface shadow-sm">
        <EmptyState
          icon={ShieldOff}
          title={t('shell:accessDenied.title')}
          description={variant === 'panel' ? t('shell:accessDenied.panelBody', { email: user?.email ?? '' }) : t('shell:accessDenied.sectionBody')}
          action={
            variant === 'panel' ? (
              <Button variant="secondary" onClick={signOut}>
                {t('common:actions.signOut')}
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => router.replace('/')}>
                {t('shell:accessDenied.goHome')}
              </Button>
            )
          }
        />
      </div>
    </div>
  );
}
