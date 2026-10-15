// Gateway GraphQL mínimo para desarrollar mfe-insights sin backend (NO es el mock oficial de bandadau-infra/mock).
// Construye el schema desde el contrato real (admin.graphql): valida las operaciones del MFE.
//   node dev/mock-gateway.mjs            -> http://localhost:4011/graphql (HTTP POST + graphql-ws)
// Tokens: dev-admin-token (ADMIN), dev-moderator-token (FORBIDDEN); otro valor -> UNAUTHENTICATED.
// MOCK_PHASE1=1 -> los campos de insights responden FEATURE_DISABLED (admin-gateway fase 1).
// Control: POST /__mock/alert (alerta en vivo), POST /__mock/reset. Preguntas con "poema" => FAILED OUT_OF_SCOPE.
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { GraphQLError, buildSchema, execute, parse, subscribe, validate } from 'graphql';
import { useServer } from 'graphql-ws/use/ws';
import { WebSocketServer } from 'ws';

const here = dirname(fileURLToPath(import.meta.url));
const SDL = join(here, '../../../bandadau-docs/contracts/graphql/admin.graphql');
const PORT = Number(process.env.PORT ?? 4011);
const ORIGIN = `http://localhost:${PORT}`;
const PHASE1 = process.env.MOCK_PHASE1 === '1';
const schema = buildSchema(readFileSync(SDL, 'utf8'));

const TOKENS = { 'dev-admin-token': ['ADMIN'], 'dev-moderator-token': ['MODERATOR'] };
const iso = (minAgo) => new Date(Date.now() - minAgo * 60_000).toISOString();
const uuid = (n) => `00000000-0000-7000-8000-${String(n).padStart(12, '0')}`;

let state;
let counter = 100;
const reportListeners = new Set();
const alertListeners = new Set();
const idempotency = new Map();

const step = (index, kind, toolName, outputSummary, durationMs, isError = false) => ({
  index, kind, toolName, input: null, outputSummary, isError, startedAt: iso(30 - index), durationMs,
});
const run = (id, agent, trigger, status, extra = {}) => ({
  id, agent, trigger, status, model: 'claude-sonnet-5-5', toolsUsed: [], tokens: { input: 2100, output: 640, total: 2740 },
  steps: [], report: null, alerts: [], error: null, stopReason: 'COMPLETED', startedAt: iso(30), finishedAt: iso(29), ...extra,
});

function readyContent(question, locale) {
  const es = locale !== 'en';
  const rows = [['Hackathon UMSA', 94], ['Feria de empleo', 71], ['Taller de IA', 46], ['Torneo de ajedrez', 31]];
  return {
    title: es ? 'Inscripciones del último mes' : 'Registrations in the last month',
    markdown: es
      ? `## Resumen\n\nEn el último mes hubo **242 inscripciones** (+18 %). El evento con más inscripciones fue *Hackathon UMSA*.\n\n- Hackathon UMSA: 94\n- Feria de empleo: 71\n- Taller de IA: 46\n- Torneo de ajedrez: 31\n\n## Limitaciones\n\nSolo se consideran eventos publicados. Más información en [el panel](https://example.com/panel).\n\n<script>alert('xss')</script><img src=x onerror=alert(1)>\n\nPregunta: «${question}»`
      : `## Summary\n\nLast month there were **242 registrations** (+18 %). The top event was *Hackathon UMSA*.\n\n- Hackathon UMSA: 94\n- Job fair: 71\n- AI workshop: 46\n- Chess tournament: 31\n\n## Limitations\n\nOnly published events are counted. More info on [the panel](https://example.com/panel).\n\n<script>alert('xss')</script><img src=x onerror=alert(1)>\n\nQuestion: "${question}"`,
    dataset: { columns: [{ name: es ? 'Evento' : 'Event', type: 'nominal' }, { name: es ? 'Inscripciones' : 'Registrations', type: 'quantitative' }], rows },
    chart: {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      title: es ? 'Inscripciones por evento' : 'Registrations by event',
      data: { name: 'dataset' },
      mark: { type: 'bar' },
      encoding: {
        x: { field: es ? 'Evento' : 'Event', type: 'nominal', title: null, sort: '-y' },
        y: { field: es ? 'Inscripciones' : 'Registrations', type: 'quantitative' },
        color: { field: es ? 'Evento' : 'Event', type: 'nominal', legend: null },
      },
    },
  };
}

function seed() {
  const ready = { id: uuid(1), question: 'Inscripciones del último mes', locale: 'es', status: 'READY', requestedBy: null, failureReason: null, createdAt: iso(90), completedAt: iso(89), audioUrl: `${ORIGIN}/media/report.wav`, audioDurationSeconds: 3, agentRun: null, ...readyContent('Inscripciones del último mes', 'es') };
  ready.agentRun = run(uuid(11), 'REPORT', 'REPORT_REQUEST', 'SUCCEEDED', { toolsUsed: ['get_registration_stats', 'list_events'], steps: [step(0, 'LLM', null, 'plan', 800), step(1, 'TOOL_CALL', 'get_registration_stats', '30 filas', 210), step(2, 'TOOL_CALL', 'list_events', '12 eventos', 150), step(3, 'LLM', null, 'redacción', 1900)], report: { id: ready.id, title: ready.title, status: 'READY' } });
  const failed = { id: uuid(2), title: null, question: 'Escríbeme un poema', locale: 'es', status: 'FAILED', requestedBy: null, markdown: null, dataset: null, chart: null, audioUrl: null, audioDurationSeconds: null, agentRun: run(uuid(12), 'REPORT', 'REPORT_REQUEST', 'FAILED', { stopReason: 'ERROR', error: 'OUT_OF_SCOPE' }), failureReason: 'OUT_OF_SCOPE', createdAt: iso(300), completedAt: iso(299) };
  const noAudio = { ...readyContent('Eventos del mes', 'en'), id: uuid(3), question: 'Events of the month', locale: 'en', status: 'READY', requestedBy: null, failureReason: null, createdAt: iso(600), completedAt: iso(599), audioUrl: null, audioDurationSeconds: null, agentRun: run(uuid(13), 'REPORT', 'REPORT_REQUEST', 'SUCCEEDED', { toolsUsed: ['list_events'] }) };
  const alerts = [
    { id: uuid(21), severity: 'CRITICAL', kind: 'SAGA_FAILURES', message: 'SAGA fallida en ticketing (3 en 10 min)', details: { service: 'ticketing-service', failures: 3 }, status: 'OPEN', resource: 'ticketing-service', occurrences: 3, agentRun: null, raisedAt: iso(2), acknowledgedAt: null, acknowledgedBy: null },
    { id: uuid(22), severity: 'WARNING', kind: 'DLQ_BACKLOG', message: 'DLQ notification-service.events: 4 mensajes', details: null, status: 'OPEN', resource: 'notification-service.events.dlq', occurrences: 1, agentRun: null, raisedAt: iso(9), acknowledgedAt: null, acknowledgedBy: null },
    { id: uuid(23), severity: 'INFO', kind: 'METRIC_ANOMALY', message: 'Las inscripciones bajaron 40 % respecto al promedio semanal', details: { metric: 'registrations.count', zscore: -2.4 }, status: 'OPEN', resource: 'registrations.count', occurrences: 1, agentRun: null, raisedAt: iso(25), acknowledgedAt: null, acknowledgedBy: null },
    { id: uuid(24), severity: 'WARNING', kind: 'SERVICE_DOWN', message: 'wallet-service no responde /health/ready', details: null, status: 'ACKNOWLEDGED', resource: 'wallet-service', occurrences: 2, agentRun: null, raisedAt: iso(180), acknowledgedAt: iso(170), acknowledgedBy: null },
  ];
  const runs = [
    run(uuid(31), 'MONITORING', 'SCHEDULE', 'SUCCEEDED', { toolsUsed: ['get_service_health', 'list_failed_sagas', 'detect_anomalies'], steps: [step(0, 'TOOL_CALL', 'get_service_health', '9 servicios UP', 120), step(1, 'TOOL_CALL', 'list_failed_sagas', '3 SAGA FAILED', 90), step(2, 'TOOL_CALL', 'detect_anomalies', 'sin anomalías', 310, true)], alerts: [{ id: uuid(21), severity: 'CRITICAL', kind: 'SAGA_FAILURES', message: 'x' }], startedAt: iso(5), finishedAt: iso(5) }),
    ready.agentRun,
    failed.agentRun,
    run(uuid(32), 'MONITORING', 'MANUAL', 'FAILED', { error: 'MCP timeout', stopReason: 'ERROR', startedAt: iso(120), finishedAt: iso(119) }),
  ];
  state = { reports: [{ ...ready }, failed, noAudio], alerts, runs, audioFetch: 0 };
}
seed();

const userError = (code, message) => ({ errors: [{ code, message, field: null }] });

function requireAdmin(ctx) {
  if (!ctx.roles) throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
  if (!ctx.roles.includes('ADMIN')) throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
  if (PHASE1) throw new GraphQLError('Insights no está disponible en la fase 1', { extensions: { code: 'FEATURE_DISABLED' } });
}

const page = (list, after, first = 20) => {
  const start = after ? Number(Buffer.from(after, 'base64').toString()) + 1 : 0;
  const slice = list.slice(start, start + first);
  const cursor = (i) => Buffer.from(String(start + i)).toString('base64');
  return {
    pageInfo: { hasNextPage: start + first < list.length, hasPreviousPage: start > 0, startCursor: slice.length ? cursor(0) : null, endCursor: slice.length ? cursor(slice.length - 1) : null },
    edges: slice.map((node, i) => ({ cursor: cursor(i), node })),
  };
};

// El reporte pasa PENDING -> RUNNING -> READY|FAILED y se emite reportReady.
function progress(report) {
  const emit = () => { for (const l of reportListeners) l(report); };
  setTimeout(() => { report.status = 'RUNNING'; }, 2500);
  setTimeout(() => {
    if (/poema|poem/i.test(report.question)) {
      Object.assign(report, { status: 'FAILED', failureReason: 'OUT_OF_SCOPE', completedAt: new Date().toISOString() });
    } else {
      Object.assign(report, { status: 'READY', completedAt: new Date().toISOString(), audioUrl: `${ORIGIN}/media/report.wav?sig=${++counter}`, audioDurationSeconds: 3, ...readyContent(report.question, report.locale) });
    }
    emit();
  }, 7000);
}

function addAlert(severity, kind, message) {
  const alert = { id: uuid(++counter), severity, kind, message, details: { source: 'mock' }, status: 'OPEN', resource: 'mock-service', occurrences: 1, agentRun: null, raisedAt: new Date().toISOString(), acknowledgedAt: null, acknowledgedBy: null };
  state.alerts.unshift(alert);
  for (const l of alertListeners) l(alert);
  return alert;
}

const root = {
  reports: ({ after, first = 20, status }, ctx) => {
    requireAdmin(ctx);
    return page(state.reports.filter((r) => !status || r.status === status), after, first);
  },
  report: ({ id }, ctx) => {
    requireAdmin(ctx);
    const r = state.reports.find((x) => x.id === id);
    if (r?.audioUrl && r.id === uuid(1)) {
      // 1.ª lectura con firma vencida (403 al reproducir); las siguientes, válida: prueba el refresco de audioUrl.
      return { ...r, audioUrl: `${ORIGIN}/media/report.wav?sig=${++state.audioFetch > 1 ? 'ok' : 'expired'}` };
    }
    return r ?? null;
  },
  requestReport: ({ question, locale }, ctx) => {
    requireAdmin(ctx);
    if (question.trim().length < 3) return { report: null, ...userError('VALIDATION_ERROR', 'La pregunta es demasiado corta') };
    const key = ctx.idempotencyKey;
    if (key && idempotency.has(key)) return { report: idempotency.get(key), errors: [] };
    const report = { id: uuid(++counter), title: null, question, locale: locale ?? 'es', status: 'PENDING', requestedBy: null, markdown: null, dataset: null, chart: null, audioUrl: null, audioDurationSeconds: null, agentRun: null, failureReason: null, createdAt: new Date().toISOString(), completedAt: null };
    state.reports.unshift(report);
    if (key) idempotency.set(key, report);
    progress(report);
    return { report, errors: [] };
  },
  alerts: ({ status, severity, first = 50 }, ctx) => {
    requireAdmin(ctx);
    return state.alerts.filter((a) => (!status || a.status === status) && (!severity || a.severity === severity)).slice(0, first);
  },
  acknowledgeAlert: ({ id }, ctx) => {
    requireAdmin(ctx);
    const alert = state.alerts.find((a) => a.id === id);
    if (!alert) return { alert: null, ...userError('NOT_FOUND', 'Alerta no encontrada') };
    if (alert.status === 'OPEN') Object.assign(alert, { status: 'ACKNOWLEDGED', acknowledgedAt: new Date().toISOString() });
    return { alert, errors: [] };
  },
  runMonitoringNow: (_a, ctx) => {
    requireAdmin(ctx);
    const alert = addAlert('WARNING', 'MODERATION_BACKLOG', 'Hay 24 elementos pendientes con más de 2 h en la cola de moderación');
    const r = run(uuid(++counter), 'MONITORING', 'MANUAL', 'SUCCEEDED', { toolsUsed: ['get_service_health', 'list_flagged_content'], steps: [step(0, 'TOOL_CALL', 'get_service_health', '9 servicios UP', 100), step(1, 'TOOL_CALL', 'list_flagged_content', '24 pendientes', 140)], alerts: [{ id: alert.id, severity: alert.severity, kind: alert.kind, message: alert.message }], startedAt: new Date().toISOString(), finishedAt: new Date().toISOString() });
    state.runs.unshift(r);
    return { agentRun: r, errors: [] };
  },
  agentRuns: ({ after, first = 20, agent }, ctx) => {
    requireAdmin(ctx);
    return page(state.runs.filter((r) => !agent || r.agent === agent), after, first);
  },
  reportReady: async function* ({ id }, ctx) {
    requireAdmin(ctx);
    yield* subscribeTo(reportListeners, (r) => r.id === id, (r) => ({ reportReady: r }));
  },
  alertRaised: async function* ({ minSeverity }, ctx) {
    requireAdmin(ctx);
    yield* subscribeTo(alertListeners, () => true, (a) => ({ alertRaised: a }));
  },
};

async function* subscribeTo(listeners, accept, wrap) {
  const queue = [];
  let wake;
  const push = (e) => { if (accept(e)) { queue.push(e); wake?.(); } };
  listeners.add(push);
  try {
    for (;;) {
      while (queue.length) yield wrap(queue.shift());
      await new Promise((r) => { wake = r; });
    }
  } finally { listeners.delete(push); }
}

// WAV de prueba: tono de 3 s (para el reproductor)
function wav() {
  const rate = 8000, seconds = 3, n = rate * seconds, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * 6000), 44 + i * 2);
  return buf;
}

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*, Authorization, Content-Type, Idempotency-Key, Accept-Language, X-Correlation-Id, X-Bandada-Client', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', ORIGIN);
  if (req.method === 'OPTIONS') { res.writeHead(204, cors).end(); return; }
  if (url.pathname === '/media/report.wav') {
    if (url.searchParams.get('sig') === 'expired') { res.writeHead(403, cors).end(); return; }
    res.writeHead(200, { ...cors, 'Content-Type': 'audio/wav' }).end(wav());
    return;
  }
  if (url.pathname === '/__mock/alert' && req.method === 'POST') { res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }).end(JSON.stringify(addAlert('CRITICAL', 'SERVICE_DOWN', 'identity-service no responde /health/ready (2 corridas)'))); return; }
  if (url.pathname === '/__mock/reset' && req.method === 'POST') { seed(); res.writeHead(204, cors).end(); return; }
  if (url.pathname === '/health') { res.writeHead(200, cors).end('ok'); return; }
  if (url.pathname === '/graphql' && req.method === 'POST') {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch { res.writeHead(400, cors).end(); return; }
    const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
    const document = parse(body.query);
    const errors = validate(schema, document);
    const out = errors.length
      ? { errors: errors.map((e) => ({ message: e.message })) }
      : await execute({ schema, document, rootValue: root, contextValue: { roles: TOKENS[token] ?? null, idempotencyKey: req.headers['idempotency-key'] }, variableValues: body.variables });
    if (process.env.MOCK_LATENCY) await new Promise((r) => setTimeout(r, Number(process.env.MOCK_LATENCY)));
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }).end(JSON.stringify(JSON.parse(JSON.stringify(out, (k, v) => (v instanceof GraphQLError ? v.toJSON() : v)))));
    return;
  }
  res.writeHead(404, cors).end();
});

const wss = new WebSocketServer({ server, path: '/graphql' });
useServer(
  {
    schema,
    roots: { subscription: root },
    onConnect: (ctx) => {
      const roles = TOKENS[ctx.connectionParams?.accessToken];
      if (!roles) return false;
      ctx.extra.roles = roles;
      return true;
    },
    context: (ctx) => ({ roles: ctx.extra.roles }),
    execute, subscribe,
  },
  wss,
);

server.listen(PORT, () => console.log(`mock-gateway insights: ${ORIGIN}/graphql${PHASE1 ? ' [FASE 1: FEATURE_DISABLED]' : ''} (token: dev-admin-token)`));
