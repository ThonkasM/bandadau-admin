# AGENTS.md — bandadau-admin

Repositorio del **panel de administración** (sistema de información empresarial) de Bandada U:
un **shell** Next.js que compone **microfrontends** en runtime como Web Components. Todo consume
**GraphQL** (`admin-gateway`). Lee primero `../AGENTS.md` y
`../bandadau-docs/docs/03-arquitectura/microfrontends.md`.

## Aplicaciones

| Carpeta | Stack | Puerto dev | Entrega |
|---|---|---|---|
| `shell/` | Next.js 16 static export, Tailwind v4, urql | 3001 | `admin.<BASE_DOMAIN>` |
| `mfe-moderation/` | Angular 21 + Angular Elements (zoneless), Transloco → `<bandada-mfe-moderation>` | 4201 | `mfe.<BASE_DOMAIN>/moderation/` |
| `mfe-insights/` | React 19 + Vite (library mode), i18next → `<bandada-mfe-insights>` | 4301 | `mfe.<BASE_DOMAIN>/insights/` |

Cada una tiene su `AGENTS.md`.

## Reglas del repo

- Cada app es un **proyecto independiente** (su `package.json` y lockfile; sin workspace en la raíz). Paquetes compartidos
  como dependencia local hermana: `file:../../bandadau-shared/packages/<pkg>` (`ui-tokens`, `i18n`, `contracts-ts`). Package manager: `corepack pnpm`.
- Los MFEs **no** importan código del shell ni entre sí. El contrato es el de
  `microfrontends.md`: propiedades `graphql-url`, `access-token`, `base-path`, `theme`, `locale`;
  eventos `bandada:navigate`, `bandada:toast`, `bandada:auth-expired`, `bandada:theme-changed`,
  `bandada:locale-changed`.
- Cada app se construye y despliega por separado (S3 + CloudFront); el shell lee `mfe-manifest.json`.
- Tokens de diseño (claro/oscuro) e i18n (es/en) obligatorios.
- Commits con scope = app: `feat(mfe-moderation): …`. CI con *path filters* por app.

## Comandos

```bash
(cd shell && corepack pnpm install && corepack pnpm dev)           # http://localhost:3001
(cd mfe-moderation && corepack pnpm install && corepack pnpm start)  # http://localhost:4201
```
