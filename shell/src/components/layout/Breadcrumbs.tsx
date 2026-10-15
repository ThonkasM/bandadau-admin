'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { NAV_ITEMS } from './nav';

const KNOWN = new Set(NAV_ITEMS.map((i) => i.key));

/** Migas derivadas de la ruta: `/users/detail/` → Usuarios › Detalle. */
export function Breadcrumbs() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const crumbs = segments
    .map((segment, index) => ({ segment, href: `/${segments.slice(0, index + 1).join('/')}/` }))
    .filter(({ segment }) => KNOWN.has(segment) || segment === 'detail')
    .map(({ segment, href }) => ({ href, label: segment === 'detail' ? t('shell:nav.detail') : t(`shell:nav.items.${segment}`) }));

  return (
    <nav aria-label={t('shell:breadcrumbs.label')} className="min-w-0">
      <ol className="flex items-center gap-1.5 text-sm text-muted">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={crumb.href} className="flex min-w-0 items-center gap-1.5">
              {index > 0 && <ChevronRight aria-hidden className="size-3.5 shrink-0 rtl:rotate-180" />}
              {last ? (
                <span aria-current="page" className="truncate font-medium text-primary">
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className="truncate rounded-sm hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-focus">
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
