import { hasErrorMessage } from '@bandada/i18n';
import { CombinedError } from '@urql/core';
import { useTranslation } from 'react-i18next';

import { ApiError } from '../api-error';

/** Códigos de dominio que el panel conoce y no están (aún) en el catálogo de @bandada/i18n. */
const SHELL_CODES = new Set([
  'NETWORK_ERROR',
  'FEATURE_DISABLED',
  'CANNOT_DEMOTE_SELF',
  'CANNOT_SUSPEND_SELF',
  'ROLES_REQUIRED',
  'DOMAIN_ALREADY_ASSIGNED',
  'HANDOFF_CODE_EXPIRED',
  'HANDOFF_TARGET_FORBIDDEN',
]);

export function codeOf(error: unknown): string {
  if (error instanceof ApiError) return error.code;
  if (error instanceof CombinedError) {
    const code = error.graphQLErrors[0]?.extensions?.code;
    if (typeof code === 'string') return code === 'UNAUTHENTICATED' ? 'UNAUTHORIZED' : code;
    if (error.networkError) return 'NETWORK_ERROR';
  }
  return 'INTERNAL_ERROR';
}

/** Mensaje traducido por `code` (nunca el `detail` crudo del servidor). */
export function useErrorText() {
  const { t } = useTranslation();
  return (error: unknown): string => {
    const code = typeof error === 'string' ? error : codeOf(error);
    if (hasErrorMessage(code)) return t(`errors:${code}`);
    if (SHELL_CODES.has(code)) return t(`shell:apiErrors.${code}`);
    return t('errors:INTERNAL_ERROR');
  };
}

/** Error de negocio devuelto en el payload de una mutación (`errors: [UserError!]!`). */
export interface UserErrorLike {
  code: string;
  message?: string;
}
