import { apiFetch } from '../http';
import { useSession } from './session-store';
import type { HandoffCode } from './types';

const base64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** PKCE S256: verifier de 32 bytes aleatorios y su challenge. */
export async function createPkcePair() {
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: base64Url(new Uint8Array(digest)) };
}

/** Panel → app (UC-03, curso inverso): devuelve la URL `…/sso/callback?code=…#cv=…` para abrir la app. */
export async function createAppHandoffUrl(): Promise<string> {
  const { verifier, challenge } = await createPkcePair();
  const handoff = await apiFetch<HandoffCode>('/auth/handoff', {
    method: 'POST',
    token: useSession.getState().accessToken,
    body: { targetApp: 'APP', codeChallenge: challenge, codeChallengeMethod: 'S256' },
  });
  return `${handoff.redirectUrl}#cv=${verifier}`;
}

/** Lee `code` (query) y `cv` (fragmento) y limpia la URL de inmediato para que no queden en historial ni Referer. */
export function takeHandoffParams(): { code: string | null; verifier: string | null } {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const verifier = new URLSearchParams(url.hash.replace(/^#/, '')).get('cv');
  window.history.replaceState(null, '', url.pathname);
  return { code, verifier };
}
