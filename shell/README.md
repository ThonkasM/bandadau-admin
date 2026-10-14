# admin-shell

Panel de administración y host de microfrontends (Web Components) con acceso SSO desde la app.

| | |
|---|---|
| Stack | Next.js 16 static export · Tailwind v4 · GraphQL · tokens + i18n compartidos |
| Puerto dev | 3001 |
| Rutas / dominio | `admin.bandada.localhost` |
| Casos de uso | UC-03, UC-18, UC-19, UC-20, UC-21 |

```bash
pnpm --filter admin-shell dev     # desarrollo (requiere `make infra-up` en `bandadau-infra`)
pnpm --filter admin-shell test    # pruebas
```

Configuración: copia `.env.example` a `.env`. Reglas, arquitectura, contratos, colas y gotchas:
**[`AGENTS.md`](AGENTS.md)** (lectura obligatoria para agentes de IA y personas).
Fuente de verdad del sistema: `bandadau-docs/docs/03-arquitectura/catalogo-servicios.md`.
