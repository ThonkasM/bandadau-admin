# admin-shell

Panel de administración y host de microfrontends (Web Components) de Bandada U, con acceso SSO desde la app.

| | |
|---|---|
| Stack | Next.js 16 static export · React 19 · Tailwind v4 · urql + graphql-ws · tokens + i18n compartidos |
| Puerto dev | 3001 (uso normal: `http://admin.bandada.localhost` vía Traefik) |
| Casos de uso | UC-03, UC-18, UC-21 (UC-19/20 en fase 2) |

Secciones: Dashboard, Usuarios (roles, suspender/reactivar), Universidades, Eventos, SAGAs (`retrySaga`),
Moderación (`<bandada-mfe-moderation>`), Insights/Reportes deshabilitados (fase 2, feature flag).

```bash
cd ../../bandadau-shared && corepack pnpm install --frozen-lockfile && corepack pnpm build   # una vez
cd ../bandadau-admin/shell && cp .env.example .env.local && corepack pnpm install
corepack pnpm dev            # http://localhost:3001
corepack pnpm typecheck && corepack pnpm lint && corepack pnpm test && corepack pnpm i18n:check && corepack pnpm build
```

Sin backend: `make mock` en `bandadau-infra` y `.env.local` apuntando a `http://localhost:4010` (ver `AGENTS.md`, la cookie
SameSite=Strict exige misma "site"; `localhost:3001`↔`localhost:4010` lo es). Para ver el MFE: `pnpm mfe:serve` tras construir
`../mfe-moderation` (o su `ng serve` en :4201; el manifiesto `public/mfe-manifest.json` apunta a `http://localhost:4201/main.js`).

Capturas en `docs/screenshots/`. Reglas, arquitectura, contratos y gotchas: **[`AGENTS.md`](AGENTS.md)**.
