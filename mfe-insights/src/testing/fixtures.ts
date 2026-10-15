import type { AgentRun, Alert, Report } from '../lib/types';

export const readyReport: Report = {
  id: '00000000-0000-7000-8000-000000000001',
  title: 'Inscripciones del último mes',
  question: 'Inscripciones del último mes',
  locale: 'es',
  status: 'READY',
  failureReason: null,
  createdAt: '2026-10-15T10:00:00Z',
  completedAt: '2026-10-15T10:01:00Z',
  audioUrl: 'http://audio.test/report.mp3',
  audioDurationSeconds: 42,
  agentRun: { id: 'run-1', status: 'SUCCEEDED', toolsUsed: ['get_registration_stats'], tokens: { input: 10, output: 5, total: 15 } },
  markdown: '## Resumen\n\nHubo **242** inscripciones. [panel](https://example.com)\n\n<script>window.pwned=1</script><img src=x onerror="window.pwned=2">',
  dataset: { columns: [{ name: 'Evento', type: 'nominal' }, { name: 'Inscripciones', type: 'quantitative' }], rows: [['Hackathon', 94], ['Feria', 71]] },
  chart: { data: { name: 'dataset' }, mark: 'bar', encoding: { x: { field: 'Evento', type: 'nominal' }, y: { field: 'Inscripciones', type: 'quantitative' } } },
};

export const pendingReport: Report = {
  ...readyReport,
  id: '00000000-0000-7000-8000-000000000002',
  title: null,
  status: 'RUNNING',
  audioUrl: null,
  markdown: undefined,
  dataset: undefined,
  chart: undefined,
};

export const criticalAlert: Alert = {
  id: '00000000-0000-7000-8000-000000000021',
  severity: 'CRITICAL',
  kind: 'SAGA_FAILURES',
  message: 'SAGA fallida en ticketing',
  details: null,
  status: 'OPEN',
  resource: 'ticketing-service',
  occurrences: 3,
  raisedAt: '2026-10-15T10:00:00Z',
  acknowledgedAt: null,
};

export const monitoringRun: AgentRun = {
  id: '00000000-0000-7000-8000-000000000031',
  agent: 'MONITORING',
  trigger: 'SCHEDULE',
  status: 'SUCCEEDED',
  model: 'claude-haiku-5-5',
  toolsUsed: ['get_service_health'],
  tokens: { input: 100, output: 20, total: 120 },
  error: null,
  stopReason: 'COMPLETED',
  startedAt: '2026-10-15T10:00:00Z',
  finishedAt: '2026-10-15T10:00:03Z',
  steps: [{ index: 0, kind: 'TOOL_CALL', toolName: 'get_service_health', outputSummary: '9 UP', isError: false, startedAt: '2026-10-15T10:00:00Z', durationMs: 120 }],
  report: null,
  alerts: [],
};
