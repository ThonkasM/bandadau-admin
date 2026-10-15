import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { Client, ClientOptions, createClient } from 'graphql-ws';

import { HostConfig } from './host-config';
import { ShellBridge } from './shell-bridge';

export type RealtimeState = 'idle' | 'connecting' | 'live' | 'offline';

export const WS_CLIENT_FACTORY = new InjectionToken<(options: ClientOptions) => Client>(
  'WS_CLIENT_FACTORY',
  { factory: () => createClient },
);

export interface RealtimeHandlers<T> {
  next: (data: T) => void;
  error?: (error: unknown) => void;
  /** El socket volvió tras una caída: conviene refrescar la consulta (entrega at-most-once). */
  reconnected?: () => void;
}

/** Cliente `graphql-ws` (subscriptions). Se recrea al cambiar `graphql-url` o el token. */
@Injectable({ providedIn: 'root' })
export class RealtimeClient {
  private readonly config = inject(HostConfig);
  private readonly bridge = inject(ShellBridge);
  private readonly factory = inject(WS_CLIENT_FACTORY);

  readonly state = signal<RealtimeState>('idle');
  private client: Client | null = null;
  private reconnectHandlers = new Set<() => void>();

  /** Descarta el socket actual (p. ej. porque cambió el token). */
  reset(): void {
    this.client?.dispose();
    this.client = null;
    this.state.set('idle');
  }

  subscribe<T>(query: string, handlers: RealtimeHandlers<T>): () => void {
    const client = this.ensureClient();
    if (handlers.reconnected) this.reconnectHandlers.add(handlers.reconnected);
    const dispose = client.subscribe<T>(
      { query },
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
    if (this.client) return this.client;
    const url = this.config.graphqlUrl().replace(/^http/, 'ws');
    this.state.set('connecting');
    this.client = this.factory({
      url,
      lazy: true,
      retryAttempts: Infinity,
      connectionParams: () => ({
        accessToken: this.config.accessToken(),
        locale: this.config.locale(),
      }),
      on: {
        connecting: () => this.state.set('connecting'),
        connected: (_socket, _payload, wasRetry) => {
          this.state.set('live');
          if (wasRetry) for (const handler of [...this.reconnectHandlers]) handler();
        },
        closed: (event) => {
          this.state.set('offline');
          const code = (event as { code?: number } | undefined)?.code;
          if (code === 4401) this.bridge.authExpired();
        },
      },
    });
    return this.client;
  }
}
