import { applyTheme, type EffectiveTheme, resolveEffectiveTheme, THEME_STORAGE_KEY, type ThemePreference } from '@bandada/ui-tokens';
import { create } from 'zustand';

import { syncPreferences } from '../auth/preferences';

interface ThemeState {
  preference: ThemePreference;
  effective: EffectiveTheme;
  setPreference: (preference: ThemePreference, options?: { sync?: boolean }) => void;
}

const isPreference = (value: unknown): value is ThemePreference => value === 'SYSTEM' || value === 'LIGHT' || value === 'DARK';

function readStored(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return isPreference(value) ? value : 'SYSTEM';
  } catch {
    return 'SYSTEM';
  }
}

const systemPrefersDark = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;

export const useTheme = create<ThemeState>((set) => ({
  preference: 'SYSTEM',
  effective: 'light',
  setPreference: (preference, options) => {
    const effective = resolveEffectiveTheme(preference, systemPrefersDark());
    try {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      /* almacenamiento no disponible */
    }
    applyTheme(effective, document);
    set({ preference, effective });
    if (options?.sync !== false) void syncPreferences({ theme: preference });
  },
}));

/** Lee la preferencia local, aplica el tema y sigue `prefers-color-scheme` mientras sea SYSTEM. Devuelve la limpieza. */
export function initTheme(): () => void {
  const initial = readStored();
  useTheme.getState().setPreference(initial, { sync: false });
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  const onChange = () => {
    if (useTheme.getState().preference === 'SYSTEM') useTheme.getState().setPreference('SYSTEM', { sync: false });
  };
  media?.addEventListener('change', onChange);
  return () => media?.removeEventListener('change', onChange);
}

export function adoptAccountTheme(theme: string | null | undefined) {
  if (isPreference(theme)) useTheme.getState().setPreference(theme, { sync: false });
}

/**
 * Cambia entre claro y oscuro con un círculo que crece desde `origin` (View Transitions API).
 * Sin soporte o con movimiento reducido el cambio es inmediato.
 */
export function toggleTheme(origin?: { x: number; y: number }): void {
  const next: ThemePreference = useTheme.getState().effective === 'dark' ? 'LIGHT' : 'DARK';
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  if (typeof document.startViewTransition !== 'function' || reduced || !origin) {
    useTheme.getState().setPreference(next);
    return;
  }
  const { x, y } = origin;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const transition = document.startViewTransition(() => useTheme.getState().setPreference(next));
  void transition.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 480, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' },
    );
  });
}
