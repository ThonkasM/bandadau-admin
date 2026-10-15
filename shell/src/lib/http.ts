import { ApiError, networkError, parseProblem } from './api-error';
import { env } from './env';
import { currentLocale } from './i18n/i18n';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
}

/**
 * Único chokepoint REST del shell. Siempre envía `X-Bandada-Client: admin` (el refresh viaja en la cookie
 * HttpOnly `bandada_admin_rt`, por eso `credentials: 'include'`), `Accept-Language` y `X-Correlation-Id`.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Language': currentLocale(),
    'X-Bandada-Client': 'admin',
    'X-Correlation-Id': crypto.randomUUID(),
  };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  let res: Response;
  try {
    res = await fetch(`${env.apiUrl}/api/v1${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'include',
      cache: 'no-store',
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw networkError();
  }
  if (!res.ok) throw await parseProblem(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export { ApiError };
