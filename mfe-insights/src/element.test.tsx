import { act, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createServices } from './app/services';
import { BandadaMfeInsights, ELEMENT_NAME } from './element';
import { GqlError } from './lib/graphql-client';
import type { InsightsService } from './lib/insights-service';
import type { RealtimeClient } from './lib/realtime';
import { criticalAlert, monitoringRun, pendingReport, readyReport } from './testing/fixtures';

vi.mock('vega-embed', () => ({ default: vi.fn(async () => ({ finalize: vi.fn() })) }));

type Handler<T> = (value: T) => void;

function fakes(overrides: Partial<Record<keyof InsightsService, unknown>> = {}) {
  const alertHandlers: Array<Handler<typeof criticalAlert>> = [];
  const base = {
    listReports: vi.fn(async () => ({ items: [{ ...readyReport, markdown: undefined, dataset: undefined, chart: undefined }, pendingReport], hasNextPage: false, endCursor: null })),
    getReport: vi.fn(async (id: string) => (id === readyReport.id ? readyReport : pendingReport)),
    requestReport: vi.fn(async (_q: string, _l: string, _k: string) => pendingReport),
    listAlerts: vi.fn(async () => [criticalAlert]),
    acknowledgeAlert: vi.fn(async () => ({ ...criticalAlert, status: 'ACKNOWLEDGED' })),
    runMonitoringNow: vi.fn(async () => monitoringRun),
    listAgentRuns: vi.fn(async () => ({ items: [monitoringRun], hasNextPage: false, endCursor: null })),
    onReportReady: vi.fn(() => () => undefined),
    onAlertRaised: vi.fn((next: Handler<typeof criticalAlert>) => {
      alertHandlers.push(next);
      return () => undefined;
    }),
  };
  const service = { ...base, ...overrides } as typeof base;
  const realtime = { state: 'live', onState: () => () => undefined, subscribe: vi.fn(), reset: vi.fn() };
  BandadaMfeInsights.servicesFactory = (config, bridge, i18n) =>
    createServices(config, bridge, i18n, { service: service as unknown as InsightsService, realtime: realtime as unknown as RealtimeClient });
  return { service, alertHandlers };
}

async function mount(attrs: { theme?: string; locale?: string; token?: string | null; url?: string | null } = {}) {
  const el = document.createElement(ELEMENT_NAME) as BandadaMfeInsights;
  el.setAttribute('theme', attrs.theme ?? 'light');
  el.setAttribute('locale', attrs.locale ?? 'es');
  if (attrs.url !== null) el.setAttribute('graphql-url', attrs.url ?? 'http://gw.test/graphql');
  if (attrs.token !== null) el.accessToken = attrs.token ?? 'tok';
  document.body.append(el);
  return el;
}

const root = (el: HTMLElement) => el.shadowRoot as ShadowRoot;
const text = (el: HTMLElement) => root(el).textContent ?? '';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  document.body.replaceChildren();
  BandadaMfeInsights.servicesFactory = null;
  vi.restoreAllMocks();
});

describe('<bandada-mfe-insights> contract', () => {
  it('is defined, uses Shadow DOM and a component stylesheet with only tokens', async () => {
    fakes();
    const el = await mount();
    expect(customElements.get(ELEMENT_NAME)).toBeDefined();
    expect(el.shadowRoot).not.toBeNull();
    const css = root(el).querySelector('style')?.textContent ?? '';
    expect(css).toContain('var(--bd-color-bg-surface)');
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/);
  });

  it('keeps access-token as a property only (never an attribute) and applies theme/locale attributes', async () => {
    fakes();
    const el = await mount({ theme: 'dark', locale: 'en', token: 'secret' });
    expect(el.accessToken).toBe('secret');
    expect(Array.from(el.attributes).some((a) => a.value === 'secret')).toBe(false);
    expect(el.getAttribute('data-theme')).toBe('dark');
    expect(el.getAttribute('lang')).toBe('en');
    el.setAttribute('theme', 'light');
    el.setAttribute('locale', 'es');
    expect(el.getAttribute('data-theme')).toBe('light');
    expect(el.locale).toBe('es');
  });

  it('shows an explanatory state when graphql-url is missing and waits for the session without a token', async () => {
    fakes();
    const noUrl = await mount({ url: null });
    await waitFor(() => expect(root(noUrl).querySelector('[data-testid=state-contract]')).not.toBeNull());
    const noToken = await mount({ token: null });
    await waitFor(() => expect(root(noToken).querySelector('[data-testid=state-waiting]')).not.toBeNull());
  });

  it('shows the FEATURE_DISABLED explanation (phase 1 gateway)', async () => {
    fakes({
      listReports: vi.fn(async () => {
        throw new GqlError('FEATURE_DISABLED');
      }),
      listAlerts: vi.fn(async () => {
        throw new GqlError('FEATURE_DISABLED');
      }),
      listAgentRuns: vi.fn(async () => {
        throw new GqlError('FEATURE_DISABLED');
      }),
    });
    const el = await mount();
    await waitFor(() => expect(root(el).querySelector('[data-testid=state-feature-disabled]')).not.toBeNull());
    expect(text(el)).toContain('fase 2');
  });
});

describe.each([
  { theme: 'light', locale: 'es', title: 'Pedir reporte', tabs: ['Reportes', 'Alertas', 'Ejecuciones de agentes'], status: 'Listo' },
  { theme: 'dark', locale: 'es', title: 'Pedir reporte', tabs: ['Reportes', 'Alertas', 'Ejecuciones de agentes'], status: 'Listo' },
  { theme: 'light', locale: 'en', title: 'Request a report', tabs: ['Reports', 'Alerts', 'Agent runs'], status: 'Ready' },
  { theme: 'dark', locale: 'en', title: 'Request a report', tabs: ['Reports', 'Alerts', 'Agent runs'], status: 'Ready' },
])('render theme=$theme locale=$locale', ({ theme, locale, title, tabs, status }) => {
  it('renders form, tabs and report list in the active language with the theme attribute', async () => {
    fakes();
    const el = await mount({ theme, locale });
    await waitFor(() => expect(text(el)).toContain(status));
    expect(el.getAttribute('data-theme')).toBe(theme);
    expect(text(el)).toContain(title);
    for (const tab of tabs) expect(text(el)).toContain(tab);
    expect(root(el).querySelectorAll('[role=tab]')).toHaveLength(3);
  });
});

describe('reports (UC-19)', () => {
  it('requests a report with question, locale and a stable Idempotency-Key per intent', async () => {
    const { service } = fakes();
    const el = await mount({ locale: 'en' });
    await waitFor(() => expect(root(el).querySelector('textarea')).not.toBeNull());
    const area = root(el).querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(area, { target: { value: 'Registrations last month' } });
    fireEvent.submit(area.closest('form') as HTMLFormElement);
    await waitFor(() => expect(service.requestReport).toHaveBeenCalledTimes(1));
    const [question, locale, key] = service.requestReport.mock.calls[0] as [string, string, string];
    expect([question, locale]).toEqual(['Registrations last month', 'en']);
    expect(key).toMatch(/[0-9a-f-]{36}/);
  });

  it('fills the question from an example chip and reuses the key when retrying the same question after an error', async () => {
    const requestReport = vi.fn().mockRejectedValueOnce(new GqlError('NETWORK_ERROR')).mockResolvedValue(pendingReport);
    const { service } = fakes({ requestReport });
    const el = await mount();
    await waitFor(() => expect(root(el).querySelector('.bi-chip')).not.toBeNull());
    fireEvent.click(root(el).querySelector('.bi-chip') as HTMLElement);
    const form = root(el).querySelector('form') as HTMLFormElement;
    expect((root(el).querySelector('textarea') as HTMLTextAreaElement).value).toBe('Inscripciones del último mes');
    fireEvent.submit(form);
    await waitFor(() => expect(root(el).querySelector('[role=alert]')).not.toBeNull());
    fireEvent.submit(form);
    await waitFor(() => expect(service.requestReport).toHaveBeenCalledTimes(2));
    expect(service.requestReport.mock.calls[0]?.[2]).toBe(service.requestReport.mock.calls[1]?.[2]);
  });

  it('opens a READY report: sanitized markdown, table, chart, audio player and tools', async () => {
    const { service } = fakes();
    const el = await mount();
    await waitFor(() => expect(root(el).querySelector('.bi-row')).not.toBeNull());
    fireEvent.click(root(el).querySelector('.bi-row') as HTMLElement);
    await waitFor(() => expect(service.getReport).toHaveBeenCalledWith(readyReport.id));
    await waitFor(() => expect(root(el).querySelector('.bi-md h2')).not.toBeNull());
    expect(root(el).querySelector('.bi-md script, .bi-md img')).toBeNull();
    expect((window as unknown as { pwned?: number }).pwned).toBeUndefined();
    expect(root(el).querySelector('.bi-md a')?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(root(el).querySelectorAll('table.bi-table tbody tr')).toHaveLength(2);
    const audio = root(el).querySelector('audio') as HTMLAudioElement;
    expect(audio.getAttribute('src')).toBe(readyReport.audioUrl);
    expect(audio.hasAttribute('controls')).toBe(true);
    expect(audio.getAttribute('aria-label')).toBeTruthy();
    expect(text(el)).toContain('get_registration_stats');
    const embed = (await import('vega-embed')).default as unknown as ReturnType<typeof vi.fn>;
    await waitFor(() => expect(embed).toHaveBeenCalled());
  });

  it('shows progress for in-flight reports and the failure explanation for FAILED ones', async () => {
    fakes({
      listReports: vi.fn(async () => ({
        items: [pendingReport, { ...readyReport, id: 'f1', title: null, status: 'FAILED', failureReason: 'OUT_OF_SCOPE', audioUrl: null }],
        hasNextPage: false,
        endCursor: null,
      })),
    });
    const el = await mount();
    await waitFor(() => expect(root(el).querySelectorAll('.bi-row')).toHaveLength(2));
    fireEvent.click(root(el).querySelectorAll('.bi-row')[0] as HTMLElement);
    await waitFor(() => expect(root(el).querySelector('.bi-progress')).not.toBeNull());
    fireEvent.click(root(el).querySelectorAll('.bi-row')[1] as HTMLElement);
    await waitFor(() => expect(text(el)).toContain('fuera de alcance'));
  });
});

describe('alerts (UC-20) and agent runs', () => {
  const openAlerts = async (el: HTMLElement) => {
    await waitFor(() => expect(root(el).querySelector('#bi-tab-alerts')).not.toBeNull());
    fireEvent.click(root(el).querySelector('#bi-tab-alerts') as HTMLElement);
    await waitFor(() => expect(root(el).querySelector('[data-testid=alert-item]')).not.toBeNull());
  };

  it('lists alerts with severity text + icon + token color class and acknowledges them', async () => {
    const { service } = fakes();
    const el = await mount();
    await openAlerts(el);
    const item = root(el).querySelector('[data-testid=alert-item]') as HTMLElement;
    expect(item.dataset['severity']).toBe('CRITICAL');
    expect(item.className).toContain('bi-alert--critical');
    expect(item.textContent).toContain('Crítica');
    expect(item.querySelector('svg')).not.toBeNull();
    fireEvent.click(item.querySelector('button') as HTMLElement);
    await waitFor(() => expect(service.acknowledgeAlert).toHaveBeenCalledWith(criticalAlert.id));
    await waitFor(() => expect(root(el).querySelector('[data-testid=alert-item]')).toBeNull());
  });

  it('shows alerts raised live (alertRaised) and notifies the shell with a toast', async () => {
    const { alertHandlers } = fakes();
    const el = await mount();
    const toasts: CustomEvent[] = [];
    el.addEventListener('bandada:toast', (e) => toasts.push(e as CustomEvent));
    await openAlerts(el);
    await waitFor(() => expect(alertHandlers.length).toBeGreaterThan(0));
    act(() => alertHandlers.at(-1)?.({ ...criticalAlert, id: 'live-1', severity: 'WARNING', kind: 'DLQ_BACKLOG', message: 'DLQ con 4 mensajes' }));
    await waitFor(() => expect(root(el).querySelectorAll('[data-testid=alert-item]')).toHaveLength(2));
    expect(toasts.at(-1)?.detail.kind).toBe('info');
    expect(toasts.at(-1)?.detail.message).toContain('Advertencia');
    // la crítica sigue primero (orden por severidad)
    expect((root(el).querySelector('[data-testid=alert-item]') as HTMLElement).dataset['severity']).toBe('CRITICAL');
  });

  it('runs monitoring now, toasts the result and adds the run to the history with its steps', async () => {
    const { service } = fakes();
    const el = await mount();
    const toasts: CustomEvent[] = [];
    el.addEventListener('bandada:toast', (e) => toasts.push(e as CustomEvent));
    await openAlerts(el);
    const run = Array.from(root(el).querySelectorAll('button')).find((b) => b.textContent === 'Ejecutar monitoreo ahora') as HTMLElement;
    fireEvent.click(run);
    await waitFor(() => expect(service.runMonitoringNow).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(toasts.some((t) => t.detail.kind === 'success')).toBe(true));
    fireEvent.click(root(el).querySelector('#bi-tab-runs') as HTMLElement);
    await waitFor(() => expect(root(el).querySelector('[data-testid=agent-run]')).not.toBeNull());
    fireEvent.click(root(el).querySelector('[data-testid=agent-run] button') as HTMLElement);
    await waitFor(() => expect(text(el)).toContain('get_service_health'));
    expect(text(el)).toContain('Paso 1');
  });

  it('emits bandada:auth-expired through the bridge contract (see graphql-client tests) and navigates tabs with arrows', async () => {
    fakes();
    const el = await mount();
    await waitFor(() => expect(root(el).querySelector('#bi-tab-reports')).not.toBeNull());
    fireEvent.keyDown(root(el).querySelector('#bi-tab-reports') as HTMLElement, { key: 'ArrowRight' });
    expect(root(el).querySelector('#bi-tab-alerts')?.getAttribute('aria-selected')).toBe('true');
  });
});
