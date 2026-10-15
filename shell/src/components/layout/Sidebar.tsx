'use client';

import { ChevronsLeft, ChevronsRight, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { useSession } from '@/lib/auth/session-store';
import { cn } from '@/lib/cn';

import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { isNavDisabled, NAV_GROUPS, visibleNav } from './nav';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const roles = useSession((s) => s.user?.roles ?? []);
  const items = visibleNav(roles);

  return (
    <>
      {mobileOpen && <div aria-hidden className="fixed inset-0 z-[var(--bd-z-sticky)] bg-surface-inverse/60 lg:hidden" onClick={onCloseMobile} />}
      <aside
        id="app-sidebar"
        aria-label={t('shell:nav.label')}
        className={cn(
          'fixed inset-y-0 start-0 z-[var(--bd-z-modal)] flex w-64 flex-col border-e border-default bg-surface transition-transform motion-reduce:transition-none',
          'lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 lg:transition-[width]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full',
          collapsed ? 'lg:w-18' : 'lg:w-64',
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-default px-4">
          <Link href="/" className="flex min-w-0 items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-focus">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mark.svg" alt="" width={32} height={32} className="size-8 shrink-0" />
            <span className={cn('truncate font-display text-md font-bold text-primary', collapsed && 'lg:hidden')}>{t('common:app.name')}</span>
          </Link>
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={onCloseMobile} aria-label={t('common:a11y.closeMenu')}>
            <X aria-hidden className="size-4" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => {
            const groupItems = items.filter((i) => i.group === group);
            if (groupItems.length === 0) return null;
            return (
              <div key={group} className="mb-5">
                <p className={cn('mb-2 px-3 text-xs font-semibold tracking-wide text-muted uppercase', collapsed && 'lg:sr-only')}>{t(`shell:nav.groups.${group}`)}</p>
                <ul className="flex flex-col gap-1">
                  {groupItems.map((item) => {
                    const Icon = item.icon;
                    const active = pathname.startsWith(item.href);
                    const disabled = isNavDisabled(item);
                    const label = t(`shell:nav.items.${item.key}`);
                    const content = (
                      <>
                        <Icon aria-hidden className="size-5 shrink-0" />
                        <span className={cn('flex-1 truncate', collapsed && 'lg:sr-only')}>{label}</span>
                        {disabled && <Badge className={cn(collapsed && 'lg:hidden')}>{t('shell:phase2.badge')}</Badge>}
                      </>
                    );
                    const base = 'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium';
                    return (
                      <li key={item.key}>
                        {disabled ? (
                          <span aria-disabled="true" title={t('shell:phase2.title')} className={cn(base, 'cursor-not-allowed text-muted')}>
                            {content}
                          </span>
                        ) : (
                          <Link
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            title={collapsed ? label : undefined}
                            onClick={onCloseMobile}
                            className={cn(
                              base,
                              'transition-colors focus-visible:outline-2 focus-visible:outline-focus',
                              active ? 'bg-action-primary text-action-primary-fg' : 'text-secondary hover:bg-surface-muted hover:text-primary',
                            )}
                          >
                            {content}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="hidden border-t border-default p-3 lg:block">
          <Button variant="ghost" size="sm" className="w-full" onClick={onToggleCollapsed} aria-expanded={!collapsed} aria-controls="app-sidebar" aria-label={collapsed ? t('shell:nav.expand') : t('shell:nav.collapse')}>
            {collapsed ? <ChevronsRight aria-hidden className="size-4 rtl:rotate-180" /> : <ChevronsLeft aria-hidden className="size-4 rtl:rotate-180" />}
            <span className={cn(collapsed && 'sr-only')}>{t('shell:nav.collapse')}</span>
          </Button>
        </div>
      </aside>
    </>
  );
}
