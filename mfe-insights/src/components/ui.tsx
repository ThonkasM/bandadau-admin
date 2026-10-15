import { formatDateTime, formatRelative } from '@bandada/i18n/format';
import { type ButtonHTMLAttributes, type ReactNode, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useHost } from '../app/services';
import type { AlertSeverity } from '../lib/types';

export function Button({
  variant = 'secondary',
  busy = false,
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger'; busy?: boolean }) {
  return (
    <button type="button" className={`bi-btn bi-btn--${variant} ${className}`.trim()} aria-busy={busy || undefined} {...rest}>
      {busy ? <span className="bi-spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function Spinner() {
  return <span className="bi-spinner" aria-hidden="true" />;
}

/** Estado vacío / error / explicativo con acción opcional. */
export function StateBox({
  tone = 'neutral',
  title,
  body,
  action,
  role,
  testId,
}: {
  tone?: 'neutral' | 'error' | 'info';
  title?: string;
  body?: string;
  action?: ReactNode;
  role?: 'status' | 'alert';
  testId?: string;
}) {
  return (
    <div className={`bi-state bi-state--${tone}`} role={role} data-testid={testId}>
      {title ? <p className="bi-state__title">{title}</p> : null}
      {body ? <p className="bi-state__body">{body}</p> : null}
      {action}
    </div>
  );
}

export function LoadingLine() {
  const { t } = useTranslation();
  return (
    <p className="bi-loading" role="status">
      <Spinner />
      <span>{t('common:states.loading')}</span>
    </p>
  );
}

/** Formato de fechas con el idioma activo del panel (`@bandada/i18n/format`). */
export function useFormat() {
  const { locale } = useHost();
  const date = useCallback((value: string | Date) => formatDateTime(value, locale, 'medium'), [locale]);
  const relative = useCallback((value: string | Date) => formatRelative(value, locale), [locale]);
  return { date, relative, locale };
}

const ICON_PROPS = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false } as const;

/** Icono por severidad: la forma distingue sin depender del color. */
export function SeverityIcon({ severity }: { severity: AlertSeverity }) {
  if (severity === 'CRITICAL') {
    return (
      <svg {...ICON_PROPS}>
        <path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86z" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
    );
  }
  if (severity === 'WARNING') {
    return (
      <svg {...ICON_PROPS}>
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
    );
  }
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}
