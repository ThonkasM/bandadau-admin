'use client';

import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { create } from 'zustand';

import { cn } from '@/lib/cn';

export type ToastKind = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastState {
  toasts: ToastItem[];
  push: (kind: ToastKind, message: string) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (kind, message) => set((s) => ({ toasts: [...s.toasts.slice(-3), { id: nextId++, kind, message }] })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

/** Uso imperativo: `toast.success(t('…'))`. El texto ya viene traducido. */
export const toast = {
  success: (message: string) => useToastStore.getState().push('success', message),
  error: (message: string) => useToastStore.getState().push('error', message),
  info: (message: string) => useToastStore.getState().push('info', message),
};

const STYLES: Record<ToastKind, string> = {
  success: 'bg-feedback-success text-feedback-success-fg border-feedback-success-border',
  error: 'bg-feedback-danger text-feedback-danger-fg border-feedback-danger-border',
  info: 'bg-feedback-info text-feedback-info-fg border-feedback-info-border',
};
const ICONS = { success: CheckCircle2, error: XCircle, info: Info } as const;

function ToastView({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const { t } = useTranslation();
  const Icon = ICONS[item.kind];
  useEffect(() => {
    const id = setTimeout(() => dismiss(item.id), 6000);
    return () => clearTimeout(id);
  }, [item.id, dismiss]);
  return (
    <div className={cn('pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-md', STYLES[item.kind])}>
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
      <p className="flex-1 text-sm font-medium">{item.message}</p>
      <button
        type="button"
        onClick={() => dismiss(item.id)}
        aria-label={t('common:actions.dismiss')}
        className="rounded-sm focus-visible:outline-2 focus-visible:outline-focus"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-4 bottom-4 z-[var(--bd-z-toast)] flex flex-col gap-2 sm:inset-x-auto sm:end-4 sm:w-96">
      {toasts.map((item) => (
        <ToastView key={item.id} item={item} />
      ))}
    </div>
  );
}
