import { apiFetch } from '../http';
import { useSession } from './session-store';

/** `PATCH /users/me/preferences`: solo con sesión y sin bloquear la UI (el cambio local ya se aplicó). */
export async function syncPreferences(patch: { locale?: 'es' | 'en'; theme?: 'SYSTEM' | 'LIGHT' | 'DARK' }) {
  const { accessToken } = useSession.getState();
  if (!accessToken) return;
  try {
    await apiFetch('/users/me/preferences', { method: 'PATCH', body: patch, token: accessToken });
  } catch {
    /* la preferencia local ya está aplicada; se reintenta en el siguiente cambio */
  }
}
