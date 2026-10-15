import { ApiError } from '../api-error';
import { apiFetch } from '../http';
import { adoptAccountLocale } from '../i18n/locale';
import { adoptAccountTheme } from '../theme/theme';
import { useSession } from './session-store';
import type { AuthTokens } from './types';

let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let inflightRefresh: Promise<string | null> | null = null;
let bootstrapPromise: Promise<void> | null = null;

function scheduleRefresh(expiresInSeconds: number) {
  clearTimeout(refreshTimer);
  const delay = Math.max(5_000, (expiresInSeconds - 60) * 1000);
  refreshTimer = setTimeout(() => void refreshAccessToken(), delay);
}

function adopt(tokens: AuthTokens, options: { adoptPreferences: boolean }) {
  useSession.getState().setSession(tokens.accessToken, tokens.user);
  scheduleRefresh(tokens.expiresIn);
  if (options.adoptPreferences) {
    adoptAccountLocale(tokens.user.locale);
    adoptAccountTheme(tokens.user.theme);
  }
}

export function clearSession() {
  clearTimeout(refreshTimer);
  inflightRefresh = null;
  useSession.getState().clear();
}

async function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  // Web Locks coordina el refresh entre pestañas (el refresh token rota y no admite reutilización).
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
  return locks ? locks.request('bandada-refresh', task) : task();
}

/** Refresh single-flight: el access token vive en memoria y el refresh en la cookie HttpOnly. */
export function refreshAccessToken(): Promise<string | null> {
  if (inflightRefresh) return inflightRefresh;
  const run = withRefreshLock(async () => {
    try {
      // OpenAPI exige `refreshToken` en el cuerpo; en modo `admin` el servidor lo toma de la cookie.
      const tokens = await apiFetch<AuthTokens>('/auth/refresh', { method: 'POST', body: {} });
      adopt(tokens, { adoptPreferences: false });
      return tokens.accessToken;
    } catch (error) {
      if (error instanceof ApiError && error.status !== 0 && error.status < 500) clearSession();
      return null;
    }
  }).finally(() => {
    inflightRefresh = null;
  });
  inflightRefresh = run;
  return run;
}

/** Al abrir el panel intenta recuperar la sesión con la cookie de refresh. Una sola vez por carga. */
export function bootstrapSession(): Promise<void> {
  if (bootstrapPromise) return bootstrapPromise;
  const state = useSession.getState();
  if (state.status === 'authenticated') return Promise.resolve();
  state.setStatus('loading');
  bootstrapPromise = refreshAccessToken().then((token) => {
    if (!token && useSession.getState().status !== 'authenticated') useSession.getState().setStatus('anonymous');
  });
  return bootstrapPromise;
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  const tokens = await apiFetch<AuthTokens>('/auth/login', { method: 'POST', body: { email, password } });
  adopt(tokens, { adoptPreferences: true });
  return tokens;
}

/** SSO app → panel (D4): canjea el código con el verifier PKCE leído de `#cv=`. */
export async function loginWithHandoff(code: string, codeVerifier: string): Promise<AuthTokens> {
  const tokens = await apiFetch<AuthTokens>('/auth/handoff/exchange', { method: 'POST', body: { code, codeVerifier } });
  adopt(tokens, { adoptPreferences: true });
  return tokens;
}

export async function logout(): Promise<void> {
  const token = useSession.getState().accessToken;
  try {
    await apiFetch('/auth/logout', { method: 'POST', body: {}, token });
  } catch {
    /* aunque falle la revocación remota, la sesión local se cierra */
  }
  clearSession();
}

/** Solo para pruebas. */
export function resetSessionModule() {
  clearTimeout(refreshTimer);
  inflightRefresh = null;
  bootstrapPromise = null;
}
