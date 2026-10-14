# mfe-insights

Microfrontend de insights (`<bandada-mfe-insights>`): reportes generativos con texto, gráfico y audio, alertas y ejecuciones de agentes.

| | |
|---|---|
| Stack | React 19 + Vite (library mode) · TanStack Query · Vega-Lite · GraphQL |
| Puerto dev | 4301 |
| Rutas / dominio | `mfe.bandada.localhost/insights/` |
| Casos de uso | UC-19, UC-20 |

```bash
pnpm --filter mfe-insights dev     # desarrollo (requiere `make infra-up` en `bandadau-infra`)
pnpm --filter mfe-insights test    # pruebas
```

Configuración: copia `.env.example` a `.env`. Reglas, arquitectura, contratos, colas y gotchas:
**[`AGENTS.md`](AGENTS.md)** (lectura obligatoria para agentes de IA y personas).
Fuente de verdad del sistema: `bandadau-docs/docs/03-arquitectura/catalogo-servicios.md`.
