'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from '@/components/ui/Toast';
import { refreshAccessToken } from '@/lib/auth/session';
import { useSession } from '@/lib/auth/session-store';
import { hasAnyRole } from '@/lib/auth/types';
import { env } from '@/lib/env';
import { useTheme } from '@/lib/theme/theme';

import { getEntry, loadScript, resetMfeCache, withTimeout } from './manifest-loader';
import { MfeFallback } from './MfeFallback';
import { type BandadaMfeElement, type MfeEntry, MfeError } from './types';

const LOAD_TIMEOUT_MS = 10_000;

type HostState = 'loading' | 'ready' | 'error';

interface NavigateDetail {
  path?: string;
  replace?: boolean;
}
interface ToastDetail {
  kind?: 'success' | 'error' | 'info';
  messageKey?: string;
  message?: string;
}

/**
 * Host de un microfrontend (microfrontends.md §4): carga el script desde el manifiesto, crea el custom element,
 * le pasa `graphql-url`, `access-token` (propiedad, nunca atributo), `base-path`, `theme` y `locale` y escucha
 * `bandada:navigate | toast | auth-expired`. Si algo falla muestra un fallback con reintento sin romper el shell.
 */
export function MfeHost({ name }: { name: string }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<BandadaMfeElement | null>(null);
  const [state, setState] = useState<HostState>('loading');
  const [error, setError] = useState<MfeError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [entry, setEntry] = useState<MfeEntry | null>(null);

  const token = useSession((s) => s.accessToken);
  const user = useSession((s) => s.user);
  const theme = useTheme((s) => s.effective);
  const locale = i18n.language === 'en' ? 'en' : 'es';

  // Lecturas "frescas" para los listeners (se registran una sola vez por montaje del elemento).
  const latest = useRef({ token, theme, locale });
  const translate = useRef(t);
  useEffect(() => {
    latest.current = { token, theme, locale };
    translate.current = t;
  });

  useEffect(() => {
    let cancelled = false;
    const cleanups: Array<() => void> = [];

    (async () => {
      try {
        const resolved = await getEntry(name, { force: attempt > 0 });
        if (cancelled) return;
        setEntry(resolved);
        if (resolved.requiredRoles && !hasAnyRole(useSession.getState().user, resolved.requiredRoles)) return;
        await withTimeout(loadScript(resolved).then(() => customElements.whenDefined(resolved.element)), LOAD_TIMEOUT_MS);
        if (cancelled || !containerRef.current) return;

        const basePath = resolved.basePath ?? `/${name}`;
        const el = document.createElement(resolved.element) as BandadaMfeElement;
        el.graphqlUrl = env.graphqlUrl;
        el.setAttribute('graphql-url', env.graphqlUrl);
        el.accessToken = latest.current.token;
        el.setAttribute('base-path', basePath);
        el.setAttribute('theme', latest.current.theme);
        el.setAttribute('locale', latest.current.locale);

        const on = (type: string, handler: (event: Event) => void) => {
          el.addEventListener(type, handler);
          cleanups.push(() => el.removeEventListener(type, handler));
        };
        on('bandada:navigate', (event) => {
          const detail = (event as CustomEvent<NavigateDetail>).detail ?? {};
          const path = detail.path ?? '/';
          // Static export: no hay rewrite de servidor para `/moderation/**`, así que la sub-ruta del MFE
          // viaja en `?path=` de la única página estática del módulo.
          const target = path === '/' ? `${basePath}/` : `${basePath}/?path=${encodeURIComponent(path)}`;
          if (detail.replace) router.replace(target);
          else router.push(target);
        });
        on('bandada:toast', (event) => {
          const detail = (event as CustomEvent<ToastDetail>).detail ?? {};
          const text = detail.messageKey ? translate.current(detail.messageKey) : (detail.message ?? translate.current('common:states.success'));
          const kind = detail.kind ?? 'info';
          toast[kind](text);
        });
        on('bandada:auth-expired', () => {
          // Refresh single-flight: reasigna la propiedad; si falla, la sesión se cierra y el guard redirige al login.
          void refreshAccessToken().then((fresh) => {
            if (fresh) el.accessToken = fresh;
          });
        });

        containerRef.current.replaceChildren(el);
        elementRef.current = el;
        setState('ready');
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof MfeError ? cause : new MfeError('MFE_LOAD_FAILED'));
        setState('error');
      }
    })();

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
      elementRef.current?.remove();
      elementRef.current = null;
    };
  }, [name, attempt, router]);

  // access token → propiedad (nunca atributo)
  useEffect(() => {
    if (elementRef.current) elementRef.current.accessToken = token;
  }, [token, state]);

  // tema resuelto y locale: atributo + evento (microfrontends.md §3)
  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;
    el.setAttribute('theme', theme);
    el.dispatchEvent(new CustomEvent('bandada:theme-changed', { detail: { theme } }));
  }, [theme, state]);
  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;
    el.setAttribute('locale', locale);
    el.dispatchEvent(new CustomEvent('bandada:locale-changed', { detail: { locale } }));
  }, [locale, state]);

  const retry = useCallback(() => {
    if (entry) resetMfeCache(entry);
    else resetMfeCache();
    setState('loading');
    setError(null);
    setAttempt((n) => n + 1);
  }, [entry]);

  if (entry?.requiredRoles && !hasAnyRole(user, entry.requiredRoles)) {
    return <EmptyState title={t('shell:accessDenied.title')} description={t('shell:accessDenied.sectionBody')} />;
  }
  if (state === 'error') {
    return <MfeFallback error={error} onRetry={retry} />;
  }
  return (
    <div className="min-h-64">
      <div ref={containerRef} aria-busy={state === 'loading'} data-testid="mfe-container" />
      {state === 'loading' && (
        <p role="status" className="py-6 text-center text-sm text-muted">
          {t('shell:mfe.loading')}
        </p>
      )}
    </div>
  );
}
