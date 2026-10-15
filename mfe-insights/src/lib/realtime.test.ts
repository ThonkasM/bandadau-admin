import type { Client, ClientOptions } from 'graphql-ws';
import { describe, expect, it, vi } from 'vitest';

import { HostConfig } from './host-config';
import { RealtimeClient } from './realtime';
import { ShellBridge } from './shell-bridge';

function setup() {
  const config = new HostConfig();
  config.update({ graphqlUrl: 'http://gw.test/graphql', accessToken: 'tok-1', locale: 'en' });
  const options: ClientOptions[] = [];
  const subscribe = vi.fn((_payload: unknown, _sink?: unknown) => () => undefined);
  const dispose = vi.fn();
  const factory = (o: ClientOptions) => {
    options.push(o);
    return { subscribe, dispose } as unknown as Client;
  };
  const target = new EventTarget();
  const bridge = new ShellBridge((k) => k);
  bridge.attach(target);
  const expired = vi.fn();
  target.addEventListener('bandada:auth-expired', expired);
  return { realtime: new RealtimeClient(config, bridge, factory), config, options, subscribe, dispose, expired };
}

describe('RealtimeClient', () => {
  it('connects over ws(s) with token and locale in connectionParams (both documented forms)', async () => {
    const { realtime, options } = setup();
    realtime.subscribe('subscription { alertRaised { id } }', undefined, { next: () => undefined });
    expect(options[0]?.url).toBe('ws://gw.test/graphql');
    const params = await (options[0]?.connectionParams as () => Record<string, unknown>)();
    expect(params).toMatchObject({ accessToken: 'tok-1', Authorization: 'Bearer tok-1', locale: 'en' });
  });

  it('recreates the socket when the token changes and passes variables', () => {
    const { realtime, config, options, subscribe, dispose } = setup();
    realtime.subscribe('subscription S($id: UUID!) { reportReady(id: $id) { id } }', { id: 'r1' }, { next: () => undefined });
    config.update({ accessToken: 'tok-2' });
    realtime.subscribe('subscription { alertRaised { id } }', undefined, { next: () => undefined });
    expect(options).toHaveLength(2);
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(subscribe.mock.calls[0]?.[0]).toMatchObject({ variables: { id: 'r1' } });
  });

  it('reports state transitions, calls reconnected after a retry and emits auth-expired on close 4401', () => {
    const { realtime, options, expired } = setup();
    const states: string[] = [];
    const reconnected = vi.fn();
    realtime.onState((s) => states.push(s));
    realtime.subscribe('subscription { alertRaised { id } }', undefined, { next: () => undefined, reconnected });
    const on = options[0]?.on as Record<string, (...args: unknown[]) => void>;
    on['connected']?.({}, undefined, false);
    on['connected']?.({}, undefined, true);
    on['closed']?.({ code: 4401 });
    expect(states).toEqual(['connecting', 'live', 'offline']);
    expect(reconnected).toHaveBeenCalledTimes(1);
    expect(expired).toHaveBeenCalledTimes(1);
  });
});
