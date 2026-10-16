'use client';

import { Moon, Sun } from 'lucide-react';
import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { toggleTheme, useTheme } from '@/lib/theme/theme';

import { Button } from './Button';

/** Alterna claro ↔ oscuro (sin opción "sistema"; el sistema solo fija el valor inicial) con un círculo que se expande. */
export function ThemeToggle() {
  const { t } = useTranslation();
  const effective = useTheme((s) => s.effective);
  const dark = effective === 'dark';
  const current = t('shell:theme.current', { mode: t(dark ? 'shell:theme.DARK' : 'shell:theme.LIGHT') });
  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    // Los clics por teclado reportan (0,0): se parte del centro del botón.
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX || rect.left + rect.width / 2;
    const y = event.clientY || rect.top + rect.height / 2;
    toggleTheme({ x, y });
  };
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      aria-pressed={dark}
      aria-label={`${t('common:theme.toggle')}. ${current}`}
      title={current}
    >
      {dark ? <Sun aria-hidden className="size-4" /> : <Moon aria-hidden className="size-4" />}
    </Button>
  );
}
