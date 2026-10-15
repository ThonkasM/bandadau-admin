'use client';

import type { Role } from '@bandada/contracts-ts/graphql/admin';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { bootstrapSession } from '@/lib/auth/session';
import { useSession } from '@/lib/auth/session-store';
import { hasAnyRole, hasPanelAccess } from '@/lib/auth/types';

import { AccessDenied } from './AccessDenied';

function FullScreenLoader() {
  const { t } = useTranslation();
  return (
    <div role="status" className="flex min-h-screen items-center justify-center bg-canvas text-muted">
      <Loader2 aria-hidden className="me-2 size-5 animate-spin motion-reduce:animate-none" />
      {t('common:states.loading')}
    </div>
  );
}

/**
 * Guard de sesión + rol de panel: sin sesión → /login (con `next`); con sesión pero sin MODERATOR/ADMIN → acceso denegado.
 * La autorización real la hace el gateway (`@auth`); esto es UX.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const status = useSession((s) => s.status);
  const user = useSession((s) => s.user);

  useEffect(() => {
    void bootstrapSession();
  }, []);

  useEffect(() => {
    if (status === 'anonymous') {
      const next = pathname && pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login/${next}`);
    }
  }, [status, pathname, router]);

  if (status !== 'authenticated') return <FullScreenLoader />;
  if (!hasPanelAccess(user)) return <AccessDenied variant="panel" />;
  return <>{children}</>;
}

/** Guard por sección: p. ej. `<RoleGuard allow={['ADMIN']}>` en usuarios, universidades, eventos y SAGAs. */
export function RoleGuard({ allow, children }: { allow: readonly Role[]; children: ReactNode }) {
  const user = useSession((s) => s.user);
  if (!hasAnyRole(user, allow)) return <AccessDenied variant="section" />;
  return <>{children}</>;
}
