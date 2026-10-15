import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { AgentRun, Alert, AlertStatus, Page, Report } from '../lib/types';
import { errorCode, useHost, useServices } from './services';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

const IN_FLIGHT = new Set(['PENDING', 'RUNNING']);
export const isInFlight = (r: Pick<Report, 'status'>): boolean => IN_FLIGHT.has(r.status);

const POLL_OFFLINE_MS = 5_000; // UC-19 5a: polling de respaldo cada 5 s sin WebSocket
const POLL_LIVE_MS = 20_000; // red de seguridad: la entrega de la subscription es at-most-once

function useReady(): boolean {
  const { graphqlUrl, accessToken } = useHost();
  return Boolean(graphqlUrl && accessToken);
}

/** Subscription con reconexión: ver `RealtimeClient` (reinicia el socket si cambia el token). */
function useRealtimeState() {
  const { realtime } = useServices();
  const [state, setState] = useState(realtime.state);
  useEffect(() => realtime.onState(setState), [realtime]);
  return state;
}

export function useRealtimeStatus() {
  return useRealtimeState();
}

// ---------------------------------------------------------------- reportes

export function useReports() {
  const { service } = useServices();
  const ready = useReady();
  const { accessToken } = useHost();
  const [items, setItems] = useState<Report[]>([]);
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [error, setError] = useState<unknown>(null);
  const [page, setPage] = useState<Pick<Page<Report>, 'hasNextPage' | 'endCursor'>>({ hasNextPage: false, endCursor: null });
  const [loadingMore, setLoadingMore] = useState(false);
  const realtimeState = useRealtimeState();

  const upsert = useCallback((report: Report) => {
    setItems((prev) => {
      const idx = prev.findIndex((r) => r.id === report.id);
      if (idx === -1) return [report, ...prev];
      const next = [...prev];
      next[idx] = { ...prev[idx], ...report } as Report;
      return next;
    });
  }, []);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const result = await service.listReports();
      setItems((prev) => {
        // conserva el detalle ya cargado (markdown/dataset/chart) de reportes que siguen en la lista
        const old = new Map(prev.map((r) => [r.id, r]));
        return result.items.map((r) => ({ ...old.get(r.id), ...r }));
      });
      setPage({ hasNextPage: result.hasNextPage, endCursor: result.endCursor });
      setError(null);
      setStatus('ready');
    } catch (e) {
      setError(e);
      setStatus('error');
    }
  }, [service]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, accessToken, load]);

  const loadMore = useCallback(async () => {
    if (!page.hasNextPage || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await service.listReports(page.endCursor);
      setItems((prev) => [...prev, ...result.items.filter((r) => !prev.some((p) => p.id === r.id))]);
      setPage({ hasNextPage: result.hasNextPage, endCursor: result.endCursor });
    } catch (e) {
      setError(e);
    } finally {
      setLoadingMore(false);
    }
  }, [service, page, loadingMore]);

  // Seguimiento de reportes en curso: reportReady(id) + polling de respaldo (5 s sin WS).
  const inFlightKey = items.filter(isInFlight).map((r) => r.id).sort().join(',');
  useEffect(() => {
    if (!ready || !inFlightKey) return;
    const ids = inFlightKey.split(',');
    const refetch = (id: string) =>
      void service
        .getReport(id)
        .then((r) => r && upsert(r))
        .catch(() => undefined);
    const disposers = ids.slice(0, 10).map((id) =>
      service.onReportReady(id, upsert, { reconnected: () => refetch(id) }),
    );
    const timer = setInterval(() => ids.forEach(refetch), realtimeState === 'live' ? POLL_LIVE_MS : POLL_OFFLINE_MS);
    return () => {
      disposers.forEach((d) => d());
      clearInterval(timer);
    };
  }, [ready, inFlightKey, realtimeState, service, upsert]);

  /** Carga el detalle completo (`report(id)`) si todavía no lo tenemos. */
  const ensureDetail = useCallback(
    async (id: string) => {
      try {
        const full = await service.getReport(id);
        if (full) upsert(full);
      } catch (e) {
        setError(e);
      }
    },
    [service, upsert],
  );

  return { items, status, error, hasNext: page.hasNextPage, loadingMore, load, loadMore, upsert, ensureDetail, realtimeState };
}

// ---------------------------------------------------------------- alertas

const SEVERITY_ORDER = { CRITICAL: 0, WARNING: 1, INFO: 2 } as const;
export const sortAlerts = (list: Alert[]): Alert[] =>
  [...list].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.raisedAt.localeCompare(a.raisedAt));

export function useAlerts(onLive?: (alert: Alert) => void) {
  const { service } = useServices();
  const ready = useReady();
  const { accessToken } = useHost();
  const [filter, setFilter] = useState<AlertStatus>('OPEN');
  const [items, setItems] = useState<Alert[]>([]);
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [error, setError] = useState<unknown>(null);
  const [acking, setAcking] = useState<ReadonlySet<string>>(new Set());
  const [openCount, setOpenCount] = useState(0);
  const realtimeState = useRealtimeState();
  const onLiveRef = useRef(onLive);
  useEffect(() => {
    onLiveRef.current = onLive;
  });

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const list = await service.listAlerts(filter);
      setItems(sortAlerts(list));
      if (filter === 'OPEN') setOpenCount(list.length);
      setError(null);
      setStatus('ready');
    } catch (e) {
      setError(e);
      setStatus('error');
    }
  }, [service, filter]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, accessToken, load]);

  const disabled = status === 'error' && errorCode(error) === 'FEATURE_DISABLED';

  // alertRaised en vivo (UC-20 paso 12)
  useEffect(() => {
    if (!ready || disabled) return;
    return service.onAlertRaised(
      (alert) => {
        setItems((prev) => (filter === 'OPEN' && alert.status === 'OPEN' && !prev.some((a) => a.id === alert.id) ? sortAlerts([alert, ...prev]) : prev));
        setOpenCount((n) => (alert.status === 'OPEN' ? n + 1 : n));
        onLiveRef.current?.(alert);
      },
      { reconnected: () => void load(), error: () => undefined },
    );
  }, [ready, accessToken, service, filter, load, disabled]);

  const acknowledge = useCallback(
    async (id: string): Promise<Alert> => {
      setAcking((s) => new Set(s).add(id));
      try {
        const updated = await service.acknowledgeAlert(id);
        setItems((prev) => (filter === 'OPEN' ? prev.filter((a) => a.id !== id) : prev.map((a) => (a.id === id ? updated : a))));
        setOpenCount((n) => Math.max(0, n - 1));
        return updated;
      } finally {
        setAcking((s) => {
          const next = new Set(s);
          next.delete(id);
          return next;
        });
      }
    },
    [service, filter],
  );

  return { items, status, error, filter, setFilter, load, acknowledge, acking, openCount, realtimeState };
}

// ---------------------------------------------------------------- ejecuciones

export function useAgentRuns() {
  const { service } = useServices();
  const ready = useReady();
  const { accessToken } = useHost();
  const [items, setItems] = useState<AgentRun[]>([]);
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [error, setError] = useState<unknown>(null);
  const [page, setPage] = useState({ hasNextPage: false, endCursor: null as string | null });
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const result = await service.listAgentRuns();
      setItems(result.items);
      setPage({ hasNextPage: result.hasNextPage, endCursor: result.endCursor });
      setError(null);
      setStatus('ready');
    } catch (e) {
      setError(e);
      setStatus('error');
    }
  }, [service]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, accessToken, load]);

  const loadMore = useCallback(async () => {
    if (!page.hasNextPage || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await service.listAgentRuns(page.endCursor);
      setItems((prev) => [...prev, ...result.items.filter((r) => !prev.some((p) => p.id === r.id))]);
      setPage({ hasNextPage: result.hasNextPage, endCursor: result.endCursor });
    } catch (e) {
      setError(e);
    } finally {
      setLoadingMore(false);
    }
  }, [service, page, loadingMore]);

  const prepend = useCallback((run: AgentRun) => setItems((prev) => [run, ...prev.filter((r) => r.id !== run.id)]), []);

  return useMemo(() => ({ items, status, error, hasNext: page.hasNextPage, loadingMore, load, loadMore, prepend }), [items, status, error, page.hasNextPage, loadingMore, load, loadMore, prepend]);
}
