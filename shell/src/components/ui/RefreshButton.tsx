'use client';

import { RotateCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';

import { Button } from './Button';

/** Recarga los datos de la pantalla sin usar el botón del navegador; gira mientras `loading`. */
export function RefreshButton({ onRefresh, loading = false, className }: { onRefresh: () => void; loading?: boolean; className?: string }) {
  const { t } = useTranslation();
  const label = t('common:actions.refresh');
  return (
    <Button variant="secondary" size="sm" onClick={onRefresh} disabled={loading} title={label} aria-label={label} className={className}>
      <RotateCw aria-hidden className={cn('size-4', loading && 'animate-spin motion-reduce:animate-none')} />
    </Button>
  );
}
