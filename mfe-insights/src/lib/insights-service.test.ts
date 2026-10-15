import { describe, expect, it, vi } from 'vitest';

import { readyReport } from '../testing/fixtures';
import { GqlError, type GqlResult,type GraphqlClient } from './graphql-client';
import { InsightsService, UserErrorException } from './insights-service';
import type { RealtimeClient } from './realtime';

function make(result: GqlResult<unknown>) {
  const request = vi.fn(async (_q: string, _v?: Record<string, unknown>, _o?: { idempotencyKey?: string }) => result);
  const subscribe = vi.fn((_q: string, _v?: Record<string, unknown>, _h?: unknown) => () => undefined);
  const service = new InsightsService({ request } as unknown as GraphqlClient, { subscribe } as unknown as RealtimeClient);
  return { service, request, subscribe };
}

describe('InsightsService', () => {
  it('requestReport sends question, locale and the idempotency key; returns the report', async () => {
    const { service, request } = make({ data: { requestReport: { report: readyReport, errors: [] } }, errors: [] });
    const report = await service.requestReport('Inscripciones', 'en', 'key-1');
    expect(report.id).toBe(readyReport.id);
    const [query, vars, opts] = request.mock.calls[0] as unknown as [string, Record<string, unknown>, { idempotencyKey: string }];
    expect(query).toContain('requestReport');
    expect(vars).toEqual({ question: 'Inscripciones', locale: 'en' });
    expect(opts.idempotencyKey).toBe('key-1');
  });

  it('turns UserError payloads into UserErrorException with the first code', async () => {
    const { service } = make({ data: { requestReport: { report: null, errors: [{ code: 'LLM_BUDGET_EXCEEDED', message: 'x' }] } }, errors: [] });
    await expect(service.requestReport('q', 'es', 'k')).rejects.toMatchObject({ code: 'LLM_BUDGET_EXCEEDED' });
    await expect(service.requestReport('q', 'es', 'k')).rejects.toBeInstanceOf(UserErrorException);
  });

  it('surfaces FEATURE_DISABLED from phase 1 as GqlError', async () => {
    const { service } = make({ data: null, errors: [{ message: 'off', code: 'FEATURE_DISABLED' }] });
    await expect(service.listReports()).rejects.toMatchObject({ code: 'FEATURE_DISABLED' });
    await expect(service.listAlerts('OPEN')).rejects.toBeInstanceOf(GqlError);
  });

  it('flattens Relay connections into pages', async () => {
    const { service } = make({
      data: { reports: { edges: [{ cursor: 'c1', node: readyReport }], pageInfo: { hasNextPage: true, endCursor: 'c1' } } },
      errors: [],
    });
    const page = await service.listReports();
    expect(page).toEqual({ items: [readyReport], hasNextPage: true, endCursor: 'c1' });
  });

  it('acknowledgeAlert and runMonitoringNow send an Idempotency-Key', async () => {
    const ack = make({ data: { acknowledgeAlert: { alert: { id: 'a' }, errors: [] } }, errors: [] });
    await ack.service.acknowledgeAlert('a');
    expect((ack.request.mock.calls[0] as unknown as [string, unknown, { idempotencyKey: string }])[2].idempotencyKey).toBeTruthy();
    const run = make({ data: { runMonitoringNow: { agentRun: { id: 'r' }, errors: [] } }, errors: [] });
    await run.service.runMonitoringNow();
    expect((run.request.mock.calls[0] as unknown as [string, unknown, { idempotencyKey: string }])[2].idempotencyKey).toBeTruthy();
  });

  it('subscribes to reportReady(id) and alertRaised through the realtime client', () => {
    const { service, subscribe } = make({ data: {}, errors: [] });
    service.onReportReady('rid', () => undefined);
    service.onAlertRaised(() => undefined);
    expect(subscribe.mock.calls[0]?.[0]).toContain('reportReady');
    expect(subscribe.mock.calls[0]?.[1]).toEqual({ id: 'rid' });
    expect(subscribe.mock.calls[1]?.[0]).toContain('alertRaised');
  });
});
