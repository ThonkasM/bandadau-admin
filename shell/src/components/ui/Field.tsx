import { type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, useId } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';

const REQUIRED_MARK = '*';

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
  className?: string;
}

/** Etiqueta + control + ayuda/error con los `aria-*` correctos. */
export function Field({ label, hint, error, required, children, className }: FieldProps) {
  const id = useId();
  const { t } = useTranslation();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-primary">
        {label}
        {required && (
          <span className="ms-1 text-feedback-danger-fg" aria-hidden>
            {REQUIRED_MARK}
          </span>
        )}
        {required && <span className="sr-only">{t('common:a11y.required')}</span>}
      </label>
      {children({ id, describedBy, invalid: !!error })}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-feedback-danger-fg">
          {error}
        </p>
      )}
    </div>
  );
}

const CONTROL =
  'w-full rounded-md border bg-surface px-3 min-h-11 md:min-h-10 text-sm text-primary placeholder:text-muted ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus ' +
  'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted';

export function Input({ className, invalid, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input aria-invalid={invalid || undefined} className={cn(CONTROL, invalid ? 'border-feedback-danger-border' : 'border-strong', className)} {...rest} />;
}

export function Select({ className, invalid, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select aria-invalid={invalid || undefined} className={cn(CONTROL, 'pe-8', invalid ? 'border-feedback-danger-border' : 'border-strong', className)} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className, invalid, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(CONTROL, 'min-h-24 py-2', invalid ? 'border-feedback-danger-border' : 'border-strong', className)}
      {...rest}
    />
  );
}

export function Checkbox({ label, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={cn('inline-flex min-h-11 items-center gap-2 text-sm text-primary md:min-h-8', rest.disabled && 'opacity-70', className)}>
      <input type="checkbox" className="size-4 accent-action-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus" {...rest} />
      {label}
    </label>
  );
}
