'use client';

import { X } from 'lucide-react';
import { type ReactNode, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { useFocusTrap } from '@/hooks/useFocusTrap';

import { Button } from './Button';

interface ModalProps {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { t } = useTranslation();
  useFocusTrap(ref, open, onClose);
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[var(--bd-z-modal)] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div aria-hidden className="absolute inset-0 bg-surface-inverse/60" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-xl border border-default bg-surface-raised shadow-lg sm:rounded-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-default px-5 py-4">
          <h2 id={titleId} className="font-display text-lg font-semibold text-primary">
            {title}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('common:actions.close')}>
            <X aria-hidden className="size-4" />
          </Button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-default px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
