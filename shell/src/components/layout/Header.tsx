'use client';

import { Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '../ui/Button';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Breadcrumbs } from './Breadcrumbs';
import { UserMenu } from './UserMenu';

export function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-[var(--bd-z-sticky)] flex h-16 items-center gap-3 border-b border-default bg-surface px-4 lg:px-6">
      <Button variant="ghost" size="sm" className="lg:hidden" onClick={onOpenMenu} aria-label={t('common:a11y.openMenu')} aria-controls="app-sidebar">
        <Menu aria-hidden className="size-5" />
      </Button>
      <div className="min-w-0 flex-1">
        <Breadcrumbs />
      </div>
      <LanguageSwitcher />
      <ThemeToggle />
      <UserMenu />
    </header>
  );
}
