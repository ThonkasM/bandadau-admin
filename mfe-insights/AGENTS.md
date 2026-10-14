# AGENTS.md — mfe-insights (F4)

Lee primero el `AGENTS.md` del workspace (`../../AGENTS.md`), el del repo (`../AGENTS.md`), `bandadau-docs/docs/04-patrones-y-reglas/frontend-guidelines.md` (§1, §4),
`design-tokens-y-temas.md` (§6.3, §6.5), `i18n.md`, `bandadau-docs/docs/03-arquitectura/microfrontends.md` (D5)
y `bandadau-docs/docs/03-arquitectura/agentes-y-reportes-generativos.md` (D8).

## Identidad

Microfrontend de **insights** (T2) publicado como `<bandada-mfe-insights>`: pedir reportes
generativos en lenguaje natural (texto Markdown + gráfico Vega-Lite + **audio**), alertas del agente
de monitoreo en vivo, historial de ejecuciones de agentes. Pieza **React** del panel.

## Stack

React 19 · Vite (*library mode*) · wrapper propio de Custom Element o `r2wc` (verificar compatibilidad
con React 19) · TanStack Query + cliente GraphQL + `graphql-ws` · `vega-embed` · Markdown sanitizado
(DOMPurify) · Tailwind v4 compilado e inyectado en el shadow root · `@bandada/ui-tokens` ·
`@bandada/i18n` (i18next + ICU, instancia propia) · Vitest + Testing Library + MSW · Playwright.

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

## Comandos (propuestos)

```bash
pnpm --filter mfe-insights dev        # http://localhost:4301 — Traefik: mfe.bandada.localhost/insights/
pnpm --filter mfe-insights build      # dist/main.js versionado
pnpm --filter mfe-insights lint && pnpm --filter mfe-insights typecheck && pnpm --filter mfe-insights test
pnpm --filter mfe-insights test:e2e
pnpm --filter mfe-insights i18n:check
```

## Variables de entorno (`.env.example`)

```
VITE_GRAPHQL_URL=http://api.bandada.localhost/graphql      # solo standalone; en el shell llega por propiedad
VITE_GRAPHQL_WS_URL=ws://api.bandada.localhost/graphql
VITE_API_URL=http://api.bandada.localhost                  # REST insights (audio)
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
