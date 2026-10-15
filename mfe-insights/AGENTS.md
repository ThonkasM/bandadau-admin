# AGENTS.md — mfe-insights (F4)

Lee primero el `AGENTS.md` del workspace (`../../AGENTS.md`), el del repo (`../AGENTS.md`), `bandadau-docs/docs/04-patrones-y-reglas/frontend-guidelines.md` (§1, §4),
`design-tokens-y-temas.md` (§6.3, §6.5), `i18n.md`, `bandadau-docs/docs/03-arquitectura/microfrontends.md` (D5)
y `bandadau-docs/docs/03-arquitectura/agentes-y-reportes-generativos.md` (D8).

## Identidad

Microfrontend de **insights** (T2) publicado como `<bandada-mfe-insights>`: pedir reportes
generativos en lenguaje natural (texto Markdown + gráfico Vega-Lite + **audio**), alertas del agente
de monitoreo en vivo, historial de ejecuciones de agentes. Pieza **React** del panel.

## Stack

React 19 · Vite 8 (*library mode*, Rolldown) · **Custom Element propio** (`src/element.tsx`; no `r2wc`: control total
de propiedades/atributos y del montaje en el Shadow DOM) · cliente GraphQL propio (`fetch` POST + `graphql-ws`) ·
`vega-embed`/`vega-lite` 6 (chunk diferido) · `marked` + DOMPurify (Markdown sanitizado) · CSS propio con `var(--bd-*)`
inyectado en el shadow root · `@bandada/ui-tokens` (solo `tokens.css`) · `@bandada/i18n` (catálogos comunes) +
i18next + i18next-icu (instancia propia por elemento) · Vitest + Testing Library.

## Arquitectura y carpetas

```
bandadau-admin/mfe-insights/
├── src/
│   ├── element.tsx                 define <bandada-mfe-insights>; props graphqlUrl, accessToken, basePath, theme, locale
│   ├── app/                        App.tsx, router interno (memoria + base-path), providers (Query, i18n)
│   ├── features/
│   │   ├── reports/                RequestReportForm, ReportView (markdown, chart, audio), hooks (requestReport, report, reportReady)
│   │   ├── alerts/                 AlertsList, ack (acknowledgeAlert), subscription alertRaised
│   │   └── agent-runs/             historial y detalle (pasos, herramientas, tokens)
│   ├── components/ui/              primitivas con tokens
│   ├── lib/                        graphql-client.ts, query-client.ts, query-keys.ts, chart-theme.ts (tokens.ts → Vega)
│   ├── locales/{es,en}/insights.json
│   └── styles.css                  @import tailwind + tailwind-theme.css (inyectado en shadow root)
├── dev/index.html                  modo standalone
├── vite.config.ts                  build.lib → dist/main.js (ES module)
└── e2e/
```

## Comandos

```bash
cd bandadau-admin/mfe-insights && corepack pnpm install      # shared por file:../../bandadau-shared (compílalo antes: pnpm build allí)
corepack pnpm dev          # build en watch + servidor CORS en http://localhost:4301 (/ = host standalone, /main.js = el MFE)
corepack pnpm mock         # gateway GraphQL de desarrollo en :4011 (token dev-admin-token); MOCK_PHASE1=1 -> FEATURE_DISABLED
corepack pnpm lint && corepack pnpm typecheck && corepack pnpm test && corepack pnpm i18n:check
corepack pnpm build        # dist/mfe-insights/main.js (+ chunk de vega-embed) y mfe-manifest-entry.json (SRI sha384)
corepack pnpm preview      # sirve dist/ en :4301 (para probarlo dentro del shell, que apunta a http://localhost:4301/main.js)
```

Standalone: `http://localhost:4301/?gql=http://localhost:4011/graphql` (host que simula al shell: tema, idioma, token válido/inválido/sin token).
Contra la infraestructura viva: `?gql=http://api.bandada.localhost/graphql` y token de `POST /api/v1/auth/login` **con
`X-Bandada-Client: admin`** (sin esa cabecera el JWT no lleva `aud=bandada-admin` y el gateway responde `UNAUTHENTICATED`).

## Variables de entorno (`.env.example`)

```
# (informativo; el host standalone usa ?gql=<url>)
VITE_GRAPHQL_URL=http://api.bandada.localhost/graphql      # solo standalone; en el shell llega por propiedad
VITE_DEFAULT_LOCALE=es
```

## Puertos y contratos

Dev **4301**. GraphQL: `requestReport(question, locale)`, `reports(after)`, `report(id)`, `alerts(status)`,
`acknowledgeAlert(id)`, `agentRuns(after)`, `runMonitoringNow`, subscriptions `reportReady(id)`, `alertRaised`.
REST `GET /api/v1/insights/reports/{reportId}` solo para refrescar `audioUrl` prefirmada si expira.

## Contrato con el shell (D5)

Entradas `graphql-url`, `access-token` (propiedad), `base-path`, `theme`, `locale`; salidas
`bandada:navigate`, `bandada:toast`, `bandada:auth-expired`. Sin estado global compartido.

## Reglas específicas y gotchas

- **Prohibido hex/paleta cruda**, también en gráficos: la paleta de Vega-Lite sale de `tokens.ts`
  según `theme`; claro **y** oscuro obligatorios, reaccionando al atributo.
- **Prohibido texto literal**: claves en `locales/{es,en}/insights.json`; el reporte se pide con el `locale`
  activo (se genera en ese idioma) y el cliente envía `Accept-Language`.
- Markdown del LLM **siempre sanitizado**; enlaces con `rel="noopener noreferrer"`.
- Reporte asíncrono: estado `PENDING` con progreso, `reportReady` o polling de respaldo.
- Reproductor de audio accesible (controles nativos, transcripción = resumen visible).
- Estilos dentro del shadow root; no tocar `document.head` del shell salvo fuentes.
- Bundle < 300 KB gzip (Vega se carga dinámicamente si excede).

## Casos de uso

UC-19 (reporte generativo texto + audio), UC-20 (alertas del agente de monitoreo).

## Definición de hecho

`definition-of-done.md` §0, §4, §5 + E2E en el shell con LLM simulado, en `es`/`en` y claro/oscuro.

## Estado de implementación (fase 2) y decisiones

- **Carpetas reales**: `src/element.tsx` (custom element), `src/app/` (`App`, `hooks` de datos, `services` = contexto),
  `src/lib/` (`graphql-client`, `realtime`, `insights-service`, `operations`, `host-config`, `shell-bridge`, `i18n`,
  `markdown`, `dataset`, `chart-theme`), `src/features/{reports,alerts,agent-runs}`, `src/components/ui.tsx`,
  `src/locales/{es,en}/insights.json`, `src/styles.css`, `dev/` (host standalone + `mock-gateway.mjs`), `scripts/`.
- **Sin TanStack Query ni Tailwind** (el AGENTS original los proponía): estado en hooks propios y una sola hoja CSS con
  tokens; mantiene `main.js` ≈ 165 KB gzip (< 300 KB). `vega-embed` (≈ 310 KB gzip) va en un chunk cargado bajo demanda
  (`import()` relativo a `main.js`); **el SRI del manifest solo cubre `main.js`**, no el chunk (limitación de los ES modules).
- **Cliente GraphQL**: `fetch` POST siempre (Apollo rechaza GET por CSRF), `Authorization`, `Accept-Language`,
  `X-Correlation-Id`, `X-Bandada-Client: admin`, `Idempotency-Key` por intención en mutaciones (`requestReport` reutiliza la clave
  al reintentar la misma pregunta). `UNAUTHENTICATED` → `bandada:auth-expired`, espera token nuevo (10 s) y reintenta una vez.
  Operaciones en `src/lib/operations.ts`, validadas contra `admin.graphql` por `scripts/check-contract.mjs` (`pnpm test`).
- **Tiempo real**: `reportReady(id)` por cada reporte `PENDING/RUNNING` + polling de respaldo (5 s sin WebSocket, 20 s con él);
  `alertRaised` en vivo (toast `bandada:toast` + lista ordenada por severidad) y refetch al reconectar. El socket se recrea si cambia el token.
- **Fase 1**: si cualquier consulta devuelve `FEATURE_DISABLED` se muestra un estado explicativo (sin pestañas) con "Reintentar".
- **Pestañas en memoria**: el shell no devuelve la sub-ruta al MFE (solo `?path=`), así que las pestañas no emiten
  `bandada:navigate`; el evento está implementado en `ShellBridge` y probado, pero la UI actual no lo necesita.
- **Gráficos**: la spec guardada se usa sin `$schema` (vega-lite 6 vs. `v5` del contrato) y con los datos del `dataset` inyectados.
  El `config` (fondo, ejes, rejilla, paleta `color.chart.series.1..8`) se lee de los `--bd-*` del anfitrión (`getComputedStyle`) y se
  redibuja al cambiar `theme`/`locale`; `formatLocale`/`timeFormatLocale` se construyen con `Intl`.
- **Estilos**: `scripts/check-style-rules.mjs` (en `pnpm lint`) prohíbe hex/rgb/hsl en `src/`.
- **i18n**: títulos de alerta por `kind` (`insights:alerts.kind.*`), severidad/estados por `enums:*` de `@bandada/i18n`,
  errores `errors:<code>` → `insights:errors.<code>` → genérico. `pnpm i18n:check` combina los catálogos compartidos con los del MFE.
- **Pruebas** (`pnpm test`, Vitest + jsdom): cliente GraphQL, servicio, realtime, `ShellBridge` (eventos `bandada:*`), Markdown
  sanitizado, dataset/CSV, tema del gráfico y render del elemento en las 4 combinaciones tema × idioma + flujos de reportes/alertas/ejecuciones.
- **Capturas**: `docs/screenshots/` (dentro del shell, con el mock: claro/oscuro, es/en).

### Divergencias de contrato / dudas (reportadas, no resueltas aquí)
1. `Alert` no expone `params` ni `explanation` (el doc §6.3 sí los describe): el título sale de `kind` y se muestra `message`
   (texto del servidor, hoy en `es`) como detalle; `details` (JSON) en un `<details>`.
2. `GeneratedReport.dataset.columns` se acepta como `string[]` o `[{name,type}]` (el SDL solo dice "JSON").
3. `failureReason` conocidos (`OUT_OF_SCOPE`, `DATA_UNAVAILABLE`, `BUDGET_EXCEEDED`, `LLM_UNAVAILABLE`) tienen texto propio; cualquier otro → genérico.
4. El `$schema` de la spec Vega-Lite es v5 y la librería es v6; se elimina `$schema` antes de renderizar.
5. El shell (`bandadau-admin/AGENTS.md`) habla de workspace pnpm; este MFE es independiente (como `mfe-moderation`).
6. `file:` de pnpm crea **hard links** al `dist/` de `bandadau-shared`: si alguien recompila shared con nombres de chunk nuevos, las copias de
   `node_modules` quedan con `index.js` nuevo y sin el chunk (error "Can't resolve ./chunk-….js" en el shell). Solución: `pnpm install` de nuevo o copiar los chunks nuevos.

