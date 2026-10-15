import { cacheExchange, Client, fetchExchange, mapExchange, subscriptionExchange } from '@urql/core';
import { authExchange } from '@urql/exchange-auth';
import { createClient as createWsClient } from 'graphql-ws';

import { refreshAccessToken } from '../auth/session';
import { useSession } from '../auth/session-store';
import { env } from '../env';
import { currentLocale } from '../i18n/i18n';

export interface GraphQLClientHandle {
  client: Client;
  /** Cuenta de usuarios del handle: el WebSocket se cierra cuando nadie lo retiene (tolera el doble efecto de StrictMode). */
  retain: () => void;
  release: () => void;
}

const isUnauthenticated = (code: unknown) => code === 'UNAUTHENTICATED';

/**
 * Cliente urql del panel: queries/mutations por HTTP y subscriptions por `graphql-ws`.
 * - `Authorization` con el access token en memoria; ante `UNAUTHENTICATED` hace refresh single-flight y reintenta.
 * - `Accept-Language` (D14), `X-Correlation-Id` y `Idempotency-Key` (una por mutación) como cabeceras HTTP.
 */
export function createGraphQLClient(): GraphQLClientHandle {
  const ws = createWsClient({
    url: env.graphqlWsUrl,
    lazy: true,
    retryAttempts: 5,
    connectionParams: () => {
      const token = useSession.getState().accessToken;
      return { ...(token ? { Authorization: `Bearer ${token}` } : {}), locale: currentLocale() };
    },
  });

  const client = new Client({
    url: env.graphqlUrl,
    requestPolicy: 'cache-and-network',
    fetchOptions: { credentials: 'omit' },
    exchanges: [
      cacheExchange,
      mapExchange({
        onOperation(operation) {
          if (operation.kind === 'teardown') return operation;
          const headers: Record<string, string> = {
            'Accept-Language': currentLocale(),
            'X-Correlation-Id': crypto.randomUUID(),
          };
          if (operation.kind === 'mutation') headers['Idempotency-Key'] = crypto.randomUUID();
          const base = typeof operation.context.fetchOptions === 'function' ? operation.context.fetchOptions() : operation.context.fetchOptions;
          return {
            ...operation,
            context: { ...operation.context, fetchOptions: { ...base, headers: { ...(base?.headers as Record<string, string> | undefined), ...headers } } },
          };
        },
      }),
      authExchange(async (utils) => ({
        addAuthToOperation(operation) {
          const token = useSession.getState().accessToken;
          return token ? utils.appendHeaders(operation, { Authorization: `Bearer ${token}` }) : operation;
        },
        didAuthError(error) {
          return error.graphQLErrors.some((e) => isUnauthenticated(e.extensions?.code));
        },
        async refreshAuth() {
          await refreshAccessToken();
        },
      })),
      subscriptionExchange({
        forwardSubscription(request) {
          const input = { ...request, query: request.query ?? '' };
          return {
            subscribe(sink) {
              const unsubscribe = ws.subscribe(input, sink);
              return { unsubscribe };
            },
          };
        },
      }),
      fetchExchange,
    ],
  });

  let holders = 0;
  return {
    client,
    retain: () => {
      holders += 1;
    },
    release: () => {
      holders -= 1;
      setTimeout(() => {
        if (holders <= 0) void ws.dispose();
      }, 100);
    },
  };
}
