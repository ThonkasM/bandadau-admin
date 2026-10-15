import { GqlError, type GqlResult, type GraphqlClient } from './graphql-client';
import {
  ACKNOWLEDGE_ALERT_MUTATION,
  AGENT_RUNS_QUERY,
  ALERT_RAISED_SUBSCRIPTION,
  ALERTS_QUERY,
  REPORT_QUERY,
  REPORT_READY_SUBSCRIPTION,
  REPORTS_QUERY,
  REQUEST_REPORT_MUTATION,
  RUN_MONITORING_MUTATION,
} from './operations';
import type { RealtimeClient } from './realtime';
import type { AgentRun, Alert, AlertSeverity, AlertStatus, Locale, Page, Report } from './types';

interface UserErrorItem {
  code: string;
  message: string;
  field?: string[] | null;
}

interface Connection<T> {
  edges: Array<{ cursor: string; node: T }>;
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

/** Error de negocio devuelto en `errors: [UserError!]!` de una mutación. */
export class UserErrorException extends GqlError {
  constructor(readonly userErrors: UserErrorItem[]) {
    super(userErrors[0]?.code ?? 'INTERNAL_SERVER_ERROR', userErrors[0]?.message);
    this.name = 'UserErrorException';
  }
}

/** Convierte errores GraphQL de nivel superior en `GqlError` (FEATURE_DISABLED, FORBIDDEN, ...). */
function unwrap<T>(result: GqlResult<T>): T {
  const first = result.errors[0];
  if (first) throw new GqlError(first.code, first.message, result.errors);
  if (!result.data) throw new GqlError('INVALID_RESPONSE');
  return result.data;
}

const toPage = <T>(c: Connection<T>): Page<T> => ({
  items: c.edges.map((e) => e.node),
  hasNextPage: c.pageInfo.hasNextPage,
  endCursor: c.pageInfo.endCursor,
});

/** Servicio de insights: única puerta de la UI al GraphQL (queries/mutaciones por POST + subscriptions). */
export class InsightsService {
  constructor(
    private readonly client: GraphqlClient,
    private readonly realtime: RealtimeClient,
  ) {}

  async listReports(after?: string | null, first = 20): Promise<Page<Report>> {
    const data = unwrap(await this.client.request<{ reports: Connection<Report> }>(REPORTS_QUERY, { after: after ?? null, first }));
    return toPage(data.reports);
  }

  async getReport(id: string): Promise<Report | null> {
    return unwrap(await this.client.request<{ report: Report | null }>(REPORT_QUERY, { id })).report;
  }

  /** `idempotencyKey` identifica la *intención*: el mismo valor en un reintento devuelve el mismo reporte. */
  async requestReport(question: string, locale: Locale, idempotencyKey: string): Promise<Report> {
    const data = unwrap(
      await this.client.request<{ requestReport: { report: Report | null; errors: UserErrorItem[] } }>(
        REQUEST_REPORT_MUTATION,
        { question, locale: locale === 'en' ? 'en' : 'es' },
        { idempotencyKey },
      ),
    );
    const payload = data.requestReport;
    if (payload.errors.length > 0) throw new UserErrorException(payload.errors);
    if (!payload.report) throw new GqlError('INVALID_RESPONSE');
    return payload.report;
  }

  async listAlerts(status?: AlertStatus, severity?: AlertSeverity): Promise<Alert[]> {
    const data = unwrap(
      await this.client.request<{ alerts: Alert[] }>(ALERTS_QUERY, {
        status: status ?? null,
        severity: severity ?? null,
        first: 50,
      }),
    );
    return data.alerts;
  }

  async acknowledgeAlert(id: string): Promise<Alert> {
    const data = unwrap(
      await this.client.request<{ acknowledgeAlert: { alert: Alert | null; errors: UserErrorItem[] } }>(
        ACKNOWLEDGE_ALERT_MUTATION,
        { id },
        // Reconocer es idempotente por diseño; la clave sigue la intención (una por alerta y clic).
        { idempotencyKey: crypto.randomUUID() },
      ),
    );
    const payload = data.acknowledgeAlert;
    if (payload.errors.length > 0) throw new UserErrorException(payload.errors);
    if (!payload.alert) throw new GqlError('INVALID_RESPONSE');
    return payload.alert;
  }

  async runMonitoringNow(): Promise<AgentRun> {
    const data = unwrap(
      await this.client.request<{ runMonitoringNow: { agentRun: AgentRun | null; errors: UserErrorItem[] } }>(
        RUN_MONITORING_MUTATION,
        undefined,
        { idempotencyKey: crypto.randomUUID() },
      ),
    );
    const payload = data.runMonitoringNow;
    if (payload.errors.length > 0) throw new UserErrorException(payload.errors);
    if (!payload.agentRun) throw new GqlError('INVALID_RESPONSE');
    return payload.agentRun;
  }

  async listAgentRuns(after?: string | null, first = 20): Promise<Page<AgentRun>> {
    const data = unwrap(
      await this.client.request<{ agentRuns: Connection<AgentRun> }>(AGENT_RUNS_QUERY, { after: after ?? null, first }),
    );
    return toPage(data.agentRuns);
  }

  onReportReady(id: string, next: (report: Report) => void, handlers: { error?: (e: unknown) => void; reconnected?: () => void } = {}): () => void {
    return this.realtime.subscribe<{ reportReady: Report }>(REPORT_READY_SUBSCRIPTION, { id }, {
      next: (d) => next(d.reportReady),
      ...handlers,
    });
  }

  onAlertRaised(next: (alert: Alert) => void, handlers: { error?: (e: unknown) => void; reconnected?: () => void } = {}): () => void {
    return this.realtime.subscribe<{ alertRaised: Alert }>(ALERT_RAISED_SUBSCRIPTION, undefined, {
      next: (d) => next(d.alertRaised),
      ...handlers,
    });
  }
}
