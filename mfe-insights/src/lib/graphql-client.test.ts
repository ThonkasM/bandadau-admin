import { describe, expect, it, vi } from 'vitest';

import { GqlError, GraphqlClient } from './graphql-client';
import { HostConfig } from './host-config';
import { ShellBridge } from './shell-bridge';

function setup(responses: Array<() => Response | Promise<Response>>) {
  const config = new HostConfig();
  config.update({ graphqlUrl: 'http://gw.test/graphql', accessToken: 'tok-1', locale: 'en' });
  const bridge = new ShellBridge((k) => k);
  const target = new EventTarget();
  bridge.attach(target);
  const events: string[] = [];
  target.addEventListener('bandada:auth-expired', () => events.push('auth-expired'));
  const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => (responses.shift() ?? (() => new Response('{}')))());
  const client = new GraphqlClient(config, bridge, { fetchImpl: fetchImpl as unknown as typeof fetch, tokenWaitMs: 200 });
  return { client, config, fetchImpl, events };
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('GraphqlClient', () => {
  it('always uses POST with auth, locale, client and correlation headers (never GET: Apollo CSRF)', async () => {
    const { client, fetchImpl } = setup([() => json({ data: { ok: true } })]);
    const result = await client.request<{ ok: boolean }>('query Q { ok }', { a: 1 });
    expect(result.data).toEqual({ ok: true });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://gw.test/graphql');
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer tok-1');
    expect(headers['Accept-Language']).toBe('en');
    expect(headers['X-Bandada-Client']).toBe('admin');
    expect(headers['X-Correlation-Id']).toBeTruthy();
    expect(headers['Idempotency-Key']).toBeUndefined();
    expect(JSON.parse(init.body as string)).toEqual({ query: 'query Q { ok }', variables: { a: 1 } });
  });

  it('sends the Idempotency-Key on mutations', async () => {
    const { client, fetchImpl } = setup([() => json({ data: { x: 1 } })]);
    await client.request('mutation M { x }', undefined, { idempotencyKey: 'key-123' });
    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>)['Idempotency-Key']).toBe('key-123');
  });

  it('maps GraphQL errors to stable codes (FEATURE_DISABLED)', async () => {
    const { client } = setup([() => json({ data: null, errors: [{ message: 'off', extensions: { code: 'FEATURE_DISABLED' } }] })]);
    const result = await client.request('query { reports { id } }');
    expect(result.errors[0]?.code).toBe('FEATURE_DISABLED');
  });

  it('emits bandada:auth-expired on UNAUTHENTICATED and retries once with the renewed token', async () => {
    const { client, config, fetchImpl, events } = setup([
      () => json({ data: null, errors: [{ message: 'no', extensions: { code: 'UNAUTHENTICATED' } }] }),
      () => json({ data: { ok: true } }),
    ]);
    const pending = client.request<{ ok: boolean }>('query { ok }');
    await vi.waitFor(() => expect(events).toEqual(['auth-expired']));
    config.update({ accessToken: 'tok-2' });
    await expect(pending).resolves.toMatchObject({ data: { ok: true } });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const second = fetchImpl.mock.calls[1]?.[1] as RequestInit;
    expect((second.headers as Record<string, string>)['Authorization']).toBe('Bearer tok-2');
  });

  it('throws UNAUTHENTICATED when the shell does not renew the token in time', async () => {
    const { client, events } = setup([() => json({ data: null, errors: [{ message: 'no', extensions: { code: 'UNAUTHENTICATED' } }] })]);
    await expect(client.request('query { ok }')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(events).toEqual(['auth-expired']);
  });

  it('maps transport failures to NETWORK_ERROR and missing url to CONTRACT_VIOLATION', async () => {
    const config = new HostConfig();
    const bridge = new ShellBridge((k) => k);
    const failing = new GraphqlClient(config, bridge, { fetchImpl: (() => Promise.reject(new TypeError('x'))) as unknown as typeof fetch });
    await expect(failing.request('query { ok }')).rejects.toMatchObject({ code: 'CONTRACT_VIOLATION' });
    config.update({ graphqlUrl: 'http://gw.test/graphql', accessToken: 't' });
    await expect(failing.request('query { ok }')).rejects.toBeInstanceOf(GqlError);
    await expect(failing.request('query { ok }')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});
