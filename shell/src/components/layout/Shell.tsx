'use client';

import { usePathname } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorBoundary } from './ErrorBoundary';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

const COLLAPSE_KEY = 'bandada.admin.sidebar';

export function Shell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  // Este árbol solo se renderiza tras la autenticación (en el cliente), así que leer localStorage aquí no desajusta la hidratación.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggle = () =>
    setCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, value ? '0' : '1');
      } catch {
        /* almacenamiento no disponible */
      }
      return !value;
    });

  return (
    <div className="flex min-h-screen bg-canvas">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[var(--bd-z-toast)] focus:rounded-md focus:bg-action-primary focus:px-4 focus:py-2 focus:text-action-primary-fg">
        {t('common:a11y.skipToContent')}
      </a>
      <Sidebar collapsed={collapsed} onToggleCollapsed={toggle} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onOpenMenu={() => setMobileOpen(true)} />
        <main id="main" tabIndex={-1} className="flex-1 p-4 lg:p-6">
          <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
