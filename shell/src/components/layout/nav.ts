import type { Role } from '@bandada/contracts-ts/graphql/admin';
import { CalendarDays, FileText, GraduationCap, LayoutDashboard, type LucideIcon, ShieldCheck, Sparkles, Users, Workflow } from 'lucide-react';

import { env } from '@/lib/env';

export interface NavItem {
  key: string;
  href: string;
  icon: LucideIcon;
  /** Roles que ven el ítem. `requiredRoles` real lo aplica el gateway (`@auth`); esto es UX. */
  roles: readonly Role[];
  group: 'main' | 'manage' | 'insights';
  /** Sección de fase 2 detrás de feature flag. */
  phase2?: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'dashboard', href: '/dashboard/', icon: LayoutDashboard, roles: ['ADMIN'], group: 'main' },
  { key: 'moderation', href: '/moderation/', icon: ShieldCheck, roles: ['MODERATOR', 'ADMIN'], group: 'main' },
  { key: 'users', href: '/users/', icon: Users, roles: ['ADMIN'], group: 'manage' },
  { key: 'universities', href: '/universities/', icon: GraduationCap, roles: ['ADMIN'], group: 'manage' },
  { key: 'events', href: '/events/', icon: CalendarDays, roles: ['ADMIN'], group: 'manage' },
  { key: 'sagas', href: '/sagas/', icon: Workflow, roles: ['ADMIN'], group: 'manage' },
  { key: 'insights', href: '/insights/', icon: Sparkles, roles: ['ADMIN'], group: 'insights', phase2: true },
  { key: 'reports', href: '/reports/', icon: FileText, roles: ['ADMIN'], group: 'insights', phase2: true },
];

export const NAV_GROUPS = ['main', 'manage', 'insights'] as const;

/** Un ítem de fase 2 se muestra deshabilitado salvo que el feature flag esté activo. */
export const isNavDisabled = (item: NavItem) => !!item.phase2 && !env.featureInsights;

export function visibleNav(userRoles: readonly Role[]): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.some((r) => userRoles.includes(r)));
}
