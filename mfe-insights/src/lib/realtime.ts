import { type Client, type ClientOptions, createClient } from 'graphql-ws';

import type { HostConfig } from './host-config';
import type { ShellBridge } from './shell-bridge';

export type RealtimeState = 'idle' | 'connecting' | 'live' | 'offline';

export interface RealtimeHandlers<T> {
  next: (data: T) => void;
  error?: (error: unknown) => void;
  /** El socket volvió tras una caída: conviene refrescar la consulta (entrega at-most-once). */
  reconnected?: () => void;
}

/** Cliente `graphql-ws` (subscriptions), lazy; se descarta al cambiar la URL o el token. */
export class RealtimeClient {
  private client: Client | null = null;
  private clientKey = '';
  private reconnectHandlers = new Set<() => void>();
  private stateListeners = new Set<(s: RealtimeState) => void>();
  private _state: RealtimeState = 'idle';

  constructor(
    private readonly config: HostConfig,
    private readonly bridge: ShellBridge,
    private readonly factory: (options: ClientOptions) => Client = createClient,
  ) {}

  get state(): RealtimeState {
    return this._state;
  }

  onState(listener: (s: RealtimeState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private setState(next: RealtimeState): void {
    if (this._state === next) return;
    this._state = next;
    for (const l of [...this.stateListeners]) l(next);
  }

  reset(): void {
    this.client?.dispose();
    this.client = null;
    this.clientKey = '';
    this.setState('idle');
  }

  subscribe<T>(query: string, variables: Record<string, unknown> | undefined, handlers: RealtimeHandlers<T>): () => void {
    const client = this.ensureClient();
    if (handlers.reconnected) this.reconnectHandlers.add(handlers.reconnected);
    const dispose = client.subscribe<T>(
      { query, ...(variables ? { variables } : {}) },
      {
        next: (message) => {
          if (message.data) handlers.next(message.data);
        },
        error: (error) => handlers.error?.(error),
        complete: () => undefined,
      },
    );
    return () => {
      dispose();
      if (handlers.reconnected) this.reconnectHandlers.delete(handlers.reconnected);
    };
  }

  private ensureClient(): Client {
    const key = `${this.config.graphqlUrl}|${this.config.accessToken ?? ''}`;
    if (this.client && this.clientKey === key) return this.client;
    this.client?.dispose();
    this.clientKey = key;
    const url = this.config.graphqlUrl.replace(/^http/, 'ws');
    this.setState('connecting');
    this.client = this.factory({
      url,
      lazy: true,
      retryAttempts: Infinity,
      // graphql-admin.md §6.2: `accessToken` + `locale`; el mock oficial lee `Authorization`: se envían ambas.
      connectionParams: () => {
        const token = this.config.accessToken;
        return {
          accessToken: token,
          locale: this.config.locale,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Accept-Language': this.config.locale,
        };
      },
      on: {
        connecting: () => this.setState('connecting'),
        connected: (_socket, _payload, wasRetry) => {
          this.setState('live');
          if (wasRetry) for (const handler of [...this.reconnectHandlers]) handler();
        },
        closed: (event) => {
          this.setState('offline');
          const code = (event as { code?: number } | undefined)?.code;
          if (code === 4401) this.bridge.authExpired();
        },
      },
    });
    return this.client;
  }
}
