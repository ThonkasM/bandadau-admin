import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-action-primary text-action-primary-fg hover:bg-action-primary-hover active:bg-action-primary-pressed',
  secondary: 'bg-action-secondary text-action-secondary-fg hover:bg-action-secondary-hover active:bg-action-secondary-pressed',
  danger: 'bg-action-danger text-action-danger-fg hover:bg-action-danger-hover active:bg-action-danger-pressed',
  ghost: 'text-primary hover:bg-surface-muted active:bg-action-secondary-hover',
};

const SIZES = { sm: 'min-h-9 px-3 text-sm', md: 'min-h-11 px-4 text-sm md:min-h-10' } as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: keyof typeof SIZES;
  loading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', loading = false, disabled, className, children, type = 'button', ...rest }: ButtonProps) {
  const { t } = useTranslation();
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
        'disabled:cursor-not-allowed disabled:bg-action-disabled disabled:text-action-disabled-fg',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />}
      {loading && <span className="sr-only">{t('common:a11y.loading')}</span>}
      {children}
    </button>
  );
}
