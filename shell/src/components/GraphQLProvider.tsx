'use client';

import { type ReactNode, useEffect, useMemo } from 'react';
import { Provider } from 'urql';

import { useSession } from '@/lib/auth/session-store';
import { createGraphQLClient } from '@/lib/graphql/client';

/** Un cliente urql por sesión: al cambiar `epoch` (login/logout) se recrea y se vacía la caché. */
export function GraphQLProvider({ children }: { children: ReactNode }) {
  const epoch = useSession((s) => s.epoch);
  const handle = useMemo(() => {
    void epoch; // un cliente nuevo por sesión
    return createGraphQLClient();
  }, [epoch]);

  useEffect(() => {
    handle.retain();
    return () => handle.release();
  }, [handle]);

  return <Provider value={handle.client}>{children}</Provider>;
}
