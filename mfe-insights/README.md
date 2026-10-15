# mfe-insights

Microfrontend de insights (`<bandada-mfe-insights>`): reportes generativos con texto, gráfico y audio, alertas en vivo y ejecuciones de agentes.

| | |
|---|---|
| Stack | React 19 + Vite (library mode) · custom element + Shadow DOM · GraphQL (fetch + graphql-ws) · Vega-Lite · i18next |
| Puerto dev | 4301 |
| Rutas / dominio | `mfe.bandada.localhost/insights/` |
| Casos de uso | UC-19, UC-20 |

```bash
corepack pnpm install
corepack pnpm mock      # gateway GraphQL de desarrollo (:4011), construido desde el SDL del contrato
corepack pnpm dev       # http://localhost:4301  (host standalone: ?gql=http://localhost:4011/graphql)
corepack pnpm lint && corepack pnpm typecheck && corepack pnpm test && corepack pnpm i18n:check
corepack pnpm build     # dist/mfe-insights/main.js + mfe-manifest-entry.json (SRI)
```

Dentro del shell: `NEXT_PUBLIC_FEATURE_INSIGHTS=true` (por defecto en `shell/.env.example`) y el manifest apunta a
`http://localhost:4301/main.js` (usa `pnpm dev` o `pnpm preview`). Con el gateway en fase 1 (`FEATURE_DISABLED`) el MFE
muestra un estado explicativo.

Configuración: `.env.example` (solo informativo). Reglas, arquitectura, contratos y decisiones:
**[`AGENTS.md`](AGENTS.md)**. Capturas: `docs/screenshots/`.
Fuente de verdad del sistema: `bandadau-docs/docs/03-arquitectura/catalogo-servicios.md`.
