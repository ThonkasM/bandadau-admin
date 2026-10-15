import type { Role } from '@bandada/contracts-ts/graphql/admin';
import type { components } from '@bandada/contracts-ts/openapi/identity';

export type AuthTokens = components['schemas']['AuthTokens'];
export type SessionUser = AuthTokens['user'];
export type HandoffCode = components['schemas']['HandoffCode'];

/** Roles con acceso al panel (D4, `seguridad-y-sso.md`). */
export const PANEL_ROLES: readonly Role[] = ['MODERATOR', 'ADMIN'];

export const hasAnyRole = (user: Pick<SessionUser, 'roles'> | null | undefined, allowed: readonly Role[]) =>
  !!user && user.roles.some((role) => allowed.includes(role));

export const hasPanelAccess = (user: Pick<SessionUser, 'roles'> | null | undefined) => hasAnyRole(user, PANEL_ROLES);

/** Ruta de inicio según el rol: ADMIN ve el dashboard; MODERATOR (sin permisos de dashboard) va a moderación. */
export const homeFor = (user: Pick<SessionUser, 'roles'> | null | undefined) =>
  hasAnyRole(user, ['ADMIN']) ? '/dashboard/' : '/moderation/';
