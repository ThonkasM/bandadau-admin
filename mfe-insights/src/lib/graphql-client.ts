import type { HostConfig } from './host-config';
import type { ShellBridge } from './shell-bridge';

export interface GqlErrorItem {
  message: string;
  code: string;
  path?: ReadonlyArray<string | number>;
}

export interface GqlResult<T> {
  data: T | null;
  errors: GqlErrorItem[];
}

/** Error de transporte o de autenticación. `code` es estable y se traduce con `errors.<code>`. */
export class GqlError extends Error {
  constructor(
    readonly code: string,
    message?: string,
    readonly errors: GqlErrorItem[] = [],
  ) {
    super(message ?? code);
    this.name = 'GqlError';
  }
}

interface RawResponse {
  data?: unknown;
  errors?: Array<{ message?: string; path?: Array<string | number>; extensions?: { code?: string } }>;
}

export interface GraphqlClientOptions {
  /** Cuánto esperar un token nuevo tras `bandada:auth-expired`. */
  tokenWaitMs?: number;
  fetchImpl?: typeof fetch;
}

/**
 * Único punto de salida HTTP del MFE (frontend-guidelines §1.2): `Authorization`, `Accept-Language`,
 * `X-Correlation-Id`, `X-Bandada-Client` e `Idempotency-Key` (mutaciones). SIEMPRE `POST` (las queries por GET
 * las rechaza la protección CSRF de Apollo). Ante `UNAUTHENTICATED` emite `bandada:auth-expired`, espera a que
 * el shell reasigne `accessToken` y reintenta una vez.
 */
export class GraphqlClient {
  private expiredToken: string | null | undefined;
  private readonly tokenWaitMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(
    private readonly config: HostConfig,
    private readonly bridge: ShellBridge,
    options: GraphqlClientOptions = {},
  ) {
    this.tokenWaitMs = options.tokenWaitMs ?? 10_000;
    this.fetchImpl = options.fetchImpl ?? ((...args) => fetch(...args));
  }

  async request<T>(
    query: string,
    variables?: Record<string, unknown>,
    opts: { idempotencyKey?: string } = {},
  ): Promise<GqlResult<T>> {
    const url = this.config.graphqlUrl;
    if (!url) throw new GqlError('CONTRACT_VIOLATION', 'graphql-url is missing');
    const correlationId = crypto.randomUUID();

    for (let attempt = 0; ; attempt += 1) {
      const tokenUsed = this.config.accessToken;
      const result = await this.send<T>(url, query, variables, tokenUsed, correlationId, opts);
      const unauthenticated = result.errors.some((e) => e.code === 'UNAUTHENTICATED');
      if (!unauthenticated) return result;
      if (attempt === 0) {
        if (this.expiredToken !== tokenUsed) {
          this.expiredToken = tokenUsed;
          this.bridge.authExpired();
        }
        const changed = await this.config.waitForTokenChange(tokenUsed, this.tokenWaitMs);
        if (changed) continue;
      }
      throw new GqlError('UNAUTHENTICATED', undefined, result.errors);
    }
  }

  private async send<T>(
    url: string,
    query: string,
    variables: Record<string, unknown> | undefined,
    token: string | null,
    correlationId: string,
    opts: { idempotencyKey?: string },
  ): Promise<GqlResult<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Language': this.config.locale,
      'X-Correlation-Id': correlationId,
      'X-Bandada-Client': 'admin',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;

    let response: Response;
    try {
      response = await this.fetchImpl(url, { method: 'POST', headers, body: JSON.stringify({ query, variables }) });
    } catch {
      throw new GqlError('NETWORK_ERROR');
    }

    let body: RawResponse | null = null;
    try {
      body = (await response.json()) as RawResponse;
    } catch {
      body = null;
    }
    const errors = (body?.errors ?? []).map(
      (e): GqlErrorItem => ({
        message: e.message ?? '',
        code: e.extensions?.code ?? 'INTERNAL_SERVER_ERROR',
        ...(e.path ? { path: e.path } : {}),
      }),
    );
    if (!body || ((body.data === null || body.data === undefined) && errors.length === 0)) {
      if (response.status === 401) return { data: null, errors: [{ message: '', code: 'UNAUTHENTICATED' }] };
      if (response.status === 403) throw new GqlError('FORBIDDEN');
      throw new GqlError(response.ok ? 'INVALID_RESPONSE' : 'UPSTREAM_UNAVAILABLE');
    }
    return { data: (body.data as T | null | undefined) ?? null, errors };
  }
}
