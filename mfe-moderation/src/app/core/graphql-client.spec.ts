import { TestBed } from '@angular/core/testing';

import { GRAPHQL_CLIENT_OPTIONS, GqlError, GraphqlClient } from './graphql-client';
import { HostConfig } from './host-config';
import { provideI18n } from './i18n';
import { ShellBridge } from './shell-bridge';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('GraphqlClient', () => {
  let client: GraphqlClient;
  let config: HostConfig;
  let host: HTMLElement;
  const events: string[] = [];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideI18n(), { provide: GRAPHQL_CLIENT_OPTIONS, useValue: { tokenWaitMs: 50 } }],
    });
    config = TestBed.inject(HostConfig);
    config.graphqlUrl.set('http://gw.test/graphql');
    config.setAccessToken('tok-1');
    config.locale.set('en');
    host = document.createElement('div');
    events.length = 0;
    host.addEventListener('bandada:auth-expired', () => events.push('auth-expired'));
    TestBed.inject(ShellBridge).attach(host);
    client = TestBed.inject(GraphqlClient);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('sends Authorization, Accept-Language, correlation id and Idempotency-Key', async () => {
    const fetchMock = vi.fn(async () => json({ data: { ok: true } }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await client.request<{ ok: boolean }>('query { ok }', { a: 1 }, { idempotencyKey: 'k-1' });
    expect(result.data).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(url).toBe('http://gw.test/graphql');
    expect(headers['Authorization']).toBe('Bearer tok-1');
    expect(headers['Accept-Language']).toBe('en');
    expect(headers['Idempotency-Key']).toBe('k-1');
    expect(headers['X-Correlation-Id']).toMatch(/[0-9a-f-]{36}/);
  });

  it('fails with CONTRACT_VIOLATION when graphql-url is missing', async () => {
    config.graphqlUrl.set('');
    await expect(client.request('query { ok }')).rejects.toMatchObject({ code: 'CONTRACT_VIOLATION' });
  });

  it('maps a network failure to NETWORK_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))));
    await expect(client.request('query { ok }')).rejects.toBeInstanceOf(GqlError);
    await expect(client.request('query { ok }')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('emits bandada:auth-expired once and retries when the shell reassigns the token', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async () =>
        json({ data: null, errors: [{ message: 'x', extensions: { code: 'UNAUTHENTICATED' } }] }),
      )
      .mockImplementation(async () => json({ data: { ok: true } }));
    vi.stubGlobal('fetch', fetchMock);

    const pending = client.request<{ ok: boolean }>('query { ok }');
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 5));
    config.setAccessToken('tok-2');
    const result = await pending;

    expect(events).toEqual(['auth-expired']);
    expect(result.data).toEqual({ ok: true });
    const second = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect((second[1].headers as Record<string, string>)['Authorization']).toBe('Bearer tok-2');
  });

  it('gives up with UNAUTHENTICATED when no new token arrives', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ data: null, errors: [{ message: 'x', extensions: { code: 'UNAUTHENTICATED' } }] })),
    );
    await expect(client.request('query { ok }')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(events).toEqual(['auth-expired']);
  });

  it('returns partial data together with errors[] (UPSTREAM_UNAVAILABLE)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json({ data: { a: 1 }, errors: [{ message: 'down', extensions: { code: 'UPSTREAM_UNAVAILABLE' } }] }),
      ),
    );
    const result = await client.request('query { a }');
    expect(result.data).toEqual({ a: 1 });
    expect(result.errors[0]?.code).toBe('UPSTREAM_UNAVAILABLE');
  });
});
