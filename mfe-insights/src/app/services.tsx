import type { i18n as I18n } from 'i18next';
import { createContext, type ReactNode, useCallback, useContext, useSyncExternalStore } from 'react';
import { I18nextProvider } from 'react-i18next';

import { GqlError, GraphqlClient } from '../lib/graphql-client';
import { type HostConfig, type HostSnapshot } from '../lib/host-config';
import { InsightsService } from '../lib/insights-service';
import { RealtimeClient } from '../lib/realtime';
import type { ShellBridge } from '../lib/shell-bridge';

export interface Services {
  config: HostConfig;
  bridge: ShellBridge;
  realtime: RealtimeClient;
  service: InsightsService;
  i18n: I18n;
}

export function createServices(config: HostConfig, bridge: ShellBridge, i18n: I18n, overrides: Partial<Pick<Services, 'service' | 'realtime'>> = {}): Services {
  const realtime = overrides.realtime ?? new RealtimeClient(config, bridge);
  const service = overrides.service ?? new InsightsService(new GraphqlClient(config, bridge), realtime);
  return { config, bridge, realtime, service, i18n };
}

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({ services, children }: { services: Services; children: ReactNode }) {
  return (
    <ServicesContext.Provider value={services}>
      <I18nextProvider i18n={services.i18n}>{children}</I18nextProvider>
    </ServicesContext.Provider>
  );
}

export function useServices(): Services {
  const value = useContext(ServicesContext);
  if (!value) throw new Error('ServicesProvider is missing');
  return value;
}

export function useHost(): HostSnapshot {
  const { config } = useServices();
  return useSyncExternalStore(config.subscribe, config.getSnapshot, config.getSnapshot);
}

/** Código estable de un error (`GqlError.code`); cualquier otra cosa es genérica. */
export const errorCode = (error: unknown): string => (error instanceof GqlError ? error.code : 'INTERNAL_SERVER_ERROR');

/** Mensaje traducido: `errors:<code>` (compartido) → `insights:errors.<code>` → genérico. */
export function useErrorMessage(): (error: unknown) => string {
  const { i18n } = useServices();
  const lng = useHost().locale;
  return useCallback(
    (error: unknown) => {
      const code = errorCode(error);
      if (i18n.exists(`errors:${code}`, { lng })) return i18n.t(`errors:${code}`, { lng });
      if (i18n.exists(`insights:errors.${code}`, { lng })) return i18n.t(`insights:errors.${code}`, { lng });
      return i18n.t('insights:errors.generic', { lng });
    },
    [i18n, lng],
  );
}
