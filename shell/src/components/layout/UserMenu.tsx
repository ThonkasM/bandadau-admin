'use client';

import { ChevronDown, ExternalLink, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { logout } from '@/lib/auth/session';
import { useSession } from '@/lib/auth/session-store';
import { createAppHandoffUrl } from '@/lib/auth/sso';
import { useErrorText } from '@/lib/graphql/errors';

import { Badge } from '../ui/Badge';
import { toast } from '../ui/Toast';

export function UserMenu() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const router = useRouter();
  const user = useSession((s) => s.user);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;
  const initial = user.email.charAt(0).toUpperCase();

  const openInApp = async () => {
    setBusy(true);
    try {
      const url = await createAppHandoffUrl();
      window.open(url, '_blank', 'noopener');
      setOpen(false);
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await logout();
    router.replace('/login/');
  };

  const item = 'flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-start text-sm text-primary hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-60';

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-10 items-center gap-2 rounded-md px-1.5 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-focus"
      >
        <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-action-primary text-sm font-bold text-action-primary-fg">
          {initial}
        </span>
        <span className="sr-only">{t('shell:userMenu.label', { email: user.email })}</span>
        <ChevronDown aria-hidden className="hidden size-4 text-muted sm:block" />
      </button>
      {open && (
        <div role="menu" className="absolute end-0 top-full z-[var(--bd-z-dropdown)] mt-2 w-72 rounded-lg border border-default bg-surface-raised p-2 shadow-lg">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-primary">{user.email}</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {user.roles.map((role) => (
                <Badge key={role} tone="info">
                  {t(`enums:Role.${role}`)}
                </Badge>
              ))}
            </div>
          </div>
          <hr className="my-1 border-default" />
          <button type="button" role="menuitem" className={item} onClick={openInApp} disabled={busy}>
            <ExternalLink aria-hidden className="size-4" />
            {t('shell:userMenu.openInApp')}
          </button>
          <button type="button" role="menuitem" className={item} onClick={signOut}>
            <LogOut aria-hidden className="size-4" />
            {t('common:actions.signOut')}
          </button>
        </div>
      )}
    </div>
  );
}
