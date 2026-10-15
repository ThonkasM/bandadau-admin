// Gateway GraphQL mínimo para desarrollar el MFE sin backend (NO es el mock oficial de bandadau-infra/mock).
// Construye el schema desde el contrato real (admin.graphql), así que valida las operaciones del MFE.
//   node dev/mock-gateway.mjs            -> http://localhost:4010/graphql (HTTP + graphql-ws)
// Tokens de prueba: dev-moderator-token (MODERATOR), dev-admin-token (ADMIN); otro valor -> UNAUTHENTICATED.
// Control: POST /__mock/add (nuevo ítem en vivo), POST /__mock/reset, nota con "conflict" => ALREADY_MODERATED.
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { GraphQLError, buildSchema, execute, parse, subscribe, validate } from 'graphql';
import { useServer } from 'graphql-ws/use/ws';
import { WebSocketServer } from 'ws';

const here = dirname(fileURLToPath(import.meta.url));
const SDL = join(here, '../../../bandadau-docs/contracts/graphql/admin.graphql');
const PORT = Number(process.env.PORT ?? 4010);
const ORIGIN = `http://localhost:${PORT}`;
const schema = buildSchema(readFileSync(SDL, 'utf8'));

const TOKENS = { 'dev-moderator-token': ['MODERATOR'], 'dev-admin-token': ['ADMIN'] };
const ME = { id: '00000000-0000-7000-8000-00000000a001', email: 'mod@umsa.edu.bo', status: 'ACTIVE' };
const user = (n, email, status = 'ACTIVE') => ({ id: `00000000-0000-7000-8000-0000000000${n}`, email, status, roles: ['STUDENT'] });
const users = { juanp: user(11, 'juanp@umsa.edu.bo'), lucia: user(12, 'lucia@umsa.edu.bo'), marco: user(13, 'marco@umsa.edu.bo') };
const iso = (minAgo) => new Date(Date.now() - minAgo * 60_000).toISOString();

let state;
const listeners = new Set();

function media(n, kind, owner, minAgo, scores, tags, extra = {}) {
  const maxScore = Math.max(...Object.values(scores));
  return {
    id: `10000000-0000-7000-8000-0000000000${n}`, kind, purpose: 'POST', status: 'FLAGGED',
    previewUrl: `${ORIGIN}/media/${n}.svg`, thumbnailUrl: `${ORIGIN}/media/${n}.svg`, tags, ocrText: null,
    createdAt: iso(minAgo), owner,
    moderation: { decision: 'REVIEW', labels: Object.keys(scores).filter((k) => scores[k] > 0.5), scores, maxScore, modelVersion: 'nsfw-classifier v1.0.0' },
    ...extra,
  };
}
function post(n, author, text, mediaList, status = 'PUBLISHED') {
  return { id: `20000000-0000-7000-8000-0000000000${n}`, author, text, hashtags: ['campus'], visibility: 'PUBLIC', status, media: mediaList, createdAt: iso(60) };
}
function report(n, targetType, target, reason, details, reporter) {
  return { id: `30000000-0000-7000-8000-0000000000${n}`, targetType, targetId: target.id, post: target.post ?? target, reporter, reason, details, status: 'OPEN', resolution: null, resolutionNote: null, createdAt: iso(20 + Number(n)), resolvedAt: null, resolvedBy: null };
}

function seed() {
  const m1 = media('01', 'IMAGE', users.juanp, 3, { nsfw: 0.91, violence: 0.04 }, ['meme']);
  const m2 = media('02', 'VIDEO', users.marco, 12, { nsfw: 0.72, violence: 0.18 }, ['clip'], { previewUrl: `${ORIGIN}/media/expired.mp4` });
  const m3 = media('03', 'IMAGE', users.lucia, 45, { nsfw: 0.55, violence: 0.62 }, ['campus', 'pelea']);
  const p1 = post('01', users.marco, 'Esta publicación fue ocultada tras varias denuncias. Contiene opiniones muy fuertes.', [], 'HIDDEN');
  const p2 = post('02', users.juanp, 'Vendo apuntes de Cálculo II, escríbeme por privado. #apuntes', [], 'HIDDEN');
  const c1 = { id: '40000000-0000-7000-8000-000000000001', post: p2 };
  const reports = [
    report('01', 'POST', p1, 'HARASSMENT', 'Insulta a una compañera.', users.lucia),
    report('02', 'POST', p1, 'SPAM', null, users.juanp),
    report('03', 'POST', p1, 'OTHER', 'No corresponde al grupo.', users.marco),
    report('04', 'POST', p2, 'SPAM', 'Publicidad repetida.', users.lucia),
    report('05', 'COMMENT', c1, 'MISINFORMATION', 'El comentario difunde un dato falso.', users.marco),
  ];
  const items = [
    { id: m1.id, source: 'AI', media: m1, post: post('11', users.juanp, 'Mira este meme del parcial', [m1], 'PENDING_MEDIA'), openReports: 0, enqueuedAt: iso(3) },
    { id: m2.id, source: 'AI', media: m2, post: null, openReports: 0, enqueuedAt: iso(12) },
    { id: m3.id, source: 'AI', media: m3, post: post('13', users.lucia, 'Foto de la salida al campo', [m3], 'PENDING_MEDIA'), openReports: 0, enqueuedAt: iso(45) },
    { id: p1.id, source: 'REPORTS', media: null, post: p1, openReports: 3, enqueuedAt: iso(30) },
    { id: p2.id, source: 'REPORTS', media: null, post: p2, openReports: 1, enqueuedAt: iso(50) },
  ];
  state = { items, reports, nextMedia: 4 };
}
seed();

const emit = (change) => { for (const l of listeners) l({ moderationQueueChanged: change }); };
const total = () => state.items.length;
const userError = (code, message) => ({ errors: [{ code, message, field: null }] });

function addLive() {
  const n = String(state.nextMedia++).padStart(2, '0');
  const m = media(n, 'IMAGE', users.lucia, 0, { nsfw: 0.6 + Math.random() * 0.3, violence: 0.1 }, ['en-vivo']);
  const item = { id: m.id, source: 'AI', media: m, post: null, openReports: 0, enqueuedAt: new Date().toISOString() };
  state.items.unshift(item);
  emit({ type: 'ADDED', totalCount: total(), item });
  return item;
}

function removeItem(id) {
  const index = state.items.findIndex((i) => i.id === id);
  if (index < 0) return null;
  const [item] = state.items.splice(index, 1);
  emit({ type: 'RESOLVED', totalCount: total(), item });
  return item;
}

function requireAuth(ctx) {
  if (!ctx.roles) throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
  if (!ctx.roles.some((r) => r === 'MODERATOR' || r === 'ADMIN')) throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
}

const root = {
  me: (_a, ctx) => { requireAuth(ctx); return { ...ME, roles: ctx.roles, locale: 'es', theme: 'SYSTEM' }; },
  user: ({ id }, ctx) => { requireAuth(ctx); const u = Object.values(users).find((x) => x.id === id); return u ? { ...u, locale: 'es', theme: 'SYSTEM' } : null; },
  moderationQueue: ({ filter, after, first = 20 }, ctx) => {
    requireAuth(ctx);
    let list = state.items;
    if (filter?.source) list = list.filter((i) => i.source === filter.source);
    if (filter?.kind) list = list.filter((i) => (i.media ?? i.post?.media?.[0])?.kind === filter.kind);
    if (filter?.minScore != null) list = list.filter((i) => (i.media?.moderation?.maxScore ?? 0) >= filter.minScore);
    const start = after ? Number(Buffer.from(after, 'base64').toString()) + 1 : 0;
    const slice = list.slice(start, start + first);
    const cursor = (i) => Buffer.from(String(start + i)).toString('base64');
    return {
      totalCount: list.length,
      pageInfo: { hasNextPage: start + first < list.length, hasPreviousPage: start > 0, startCursor: slice.length ? cursor(0) : null, endCursor: slice.length ? cursor(slice.length - 1) : null },
      edges: slice.map((node, i) => ({ cursor: cursor(i), node })),
    };
  },
  contentReports: ({ status = 'OPEN', targetType, first = 50 }, ctx) => {
    requireAuth(ctx);
    return state.reports.filter((r) => r.status === status && (!targetType || r.targetType === targetType)).slice(0, first);
  },
  moderateMedia: ({ id, decision, note }, ctx) => {
    requireAuth(ctx);
    const item = state.items.find((i) => i.id === id && i.media);
    if (!item || item.media.status !== 'FLAGGED' || /conflict/i.test(note ?? '')) {
      if (item) removeItem(id);
      return { media: null, ...userError('ALREADY_MODERATED', 'Otro moderador ya resolvió este contenido') };
    }
    item.media.status = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    removeItem(id);
    return { media: item.media, errors: [] };
  },
  resolveContentReport: ({ input }, ctx) => {
    requireAuth(ctx);
    const r = state.reports.find((x) => x.id === input.reportId);
    if (!r) return { report: null, ...userError('NOT_FOUND', 'No encontrada') };
    if (r.status !== 'OPEN') return { report: null, ...userError('ALREADY_MODERATED', 'Resuelta') };
    r.status = input.resolution === 'KEEP' ? 'RESOLVED_KEPT' : 'RESOLVED_REMOVED';
    r.resolution = input.resolution; r.resolutionNote = input.note ?? null; r.resolvedAt = new Date().toISOString();
    if (!state.reports.some((x) => x.targetId === r.targetId && x.status === 'OPEN')) removeItem(r.targetId);
    return { report: r, errors: [] };
  },
  suspendUser: ({ input }, ctx) => {
    requireAuth(ctx);
    const u = Object.values(users).find((x) => x.id === input.userId);
    if (!u) return { user: null, ...userError('NOT_FOUND', 'Usuario no encontrado') };
    u.status = 'SUSPENDED';
    return { user: u, errors: [] };
  },
  moderationQueueChanged: async function* (_a, ctx) {
    requireAuth(ctx);
    const queue = [];
    let wake;
    const push = (e) => { queue.push(e); wake?.(); };
    listeners.add(push);
    try {
      for (;;) {
        while (queue.length) yield queue.shift();
        await new Promise((r) => { wake = r; });
      }
    } finally { listeners.delete(push); }
  },
};

const ctxFromToken = (token) => ({ roles: TOKENS[token] ?? null });
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*, Authorization, Content-Type, Idempotency-Key, Accept-Language, X-Correlation-Id', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };

function svg(n) {
  const hue = (Number(n) * 67) % 360;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400"><rect width="640" height="400" fill="hsl(${hue} 60% 55%)"/><circle cx="320" cy="200" r="110" fill="hsl(${(hue + 120) % 360} 70% 70%)"/><text x="320" y="215" font-size="42" text-anchor="middle" fill="white" font-family="sans-serif">media ${n}</text></svg>`;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', ORIGIN);
  if (req.method === 'OPTIONS') { res.writeHead(204, cors).end(); return; }
  if (url.pathname.startsWith('/media/')) {
    if (url.pathname.includes('expired')) { res.writeHead(404, cors).end(); return; }
    res.writeHead(200, { ...cors, 'Content-Type': 'image/svg+xml' }).end(svg(url.pathname.replace(/\D/g, '')));
    return;
  }
  if (url.pathname === '/__mock/add' && req.method === 'POST') { res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }).end(JSON.stringify(addLive())); return; }
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
      : await execute({ schema, document, rootValue: root, contextValue: ctxFromToken(token), variableValues: body.variables });
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
      if (!roles) return false; // graphql-ws cierra con 4403; el MFE reconecta con el token nuevo
      ctx.extra.roles = roles;
      return true;
    },
    context: (ctx) => ({ roles: ctx.extra.roles }),
    execute, subscribe,
  },
  wss,
);

server.listen(PORT, () => console.log(`mock-gateway moderación: ${ORIGIN}/graphql (tokens: dev-moderator-token, dev-admin-token)`));
