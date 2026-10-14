# mfe-moderation

Microfrontend de moderación (`<bandada-mfe-moderation>`): cola de contenido marcado por IA y denuncias.

| | |
|---|---|
| Stack | Angular 21 (zoneless, signals) + Angular Elements · Transloco · GraphQL |
| Puerto dev | 4201 |
| Rutas / dominio | `mfe.bandada.localhost/moderation/` |
| Casos de uso | UC-18, UC-10 |

```bash
pnpm --filter mfe-moderation dev     # desarrollo (requiere `make infra-up` en `bandadau-infra`)
pnpm --filter mfe-moderation test    # pruebas
```

Configuración: copia `.env.example` a `.env`. Reglas, arquitectura, contratos, colas y gotchas:
**[`AGENTS.md`](AGENTS.md)** (lectura obligatoria para agentes de IA y personas).
Fuente de verdad del sistema: `bandadau-docs/docs/03-arquitectura/catalogo-servicios.md`.
