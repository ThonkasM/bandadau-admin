'use client';

import type { ThemePreference } from '@bandada/ui-tokens';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/lib/theme/theme';

import { Button } from './Button';

const NEXT: Record<ThemePreference, ThemePreference> = { SYSTEM: 'LIGHT', LIGHT: 'DARK', DARK: 'SYSTEM' };
const ICON = { SYSTEM: Monitor, LIGHT: Sun, DARK: Moon } as const;

/** Rota SYSTEM → LIGHT → DARK; el tema efectivo lo pinta `data-theme` (tokens), sin `dark:`. */
export function ThemeToggle() {
  const { t } = useTranslation();
  const preference = useTheme((s) => s.preference);
  const setPreference = useTheme((s) => s.setPreference);
  const Icon = ICON[preference];
  const label = t(`shell:theme.${preference}`);
  const current = t('shell:theme.current', { mode: label });
  return (
    <Button variant="ghost" size="sm" onClick={() => setPreference(NEXT[preference])} title={current} aria-label={`${t('common:theme.toggle')}. ${current}`}>
      <Icon aria-hidden className="size-4" />
      <span className="hidden text-xs font-medium lg:inline">{label}</span>
    </Button>
  );
}
