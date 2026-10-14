# AGENTS.md — admin-shell (F2)

Lee primero el `AGENTS.md` del workspace (`../../AGENTS.md`), el del repo (`../AGENTS.md`), `bandadau-docs/docs/04-patrones-y-reglas/frontend-guidelines.md` (§1, §2.2),
`design-tokens-y-temas.md`, `i18n.md`, `bandadau-docs/docs/03-arquitectura/microfrontends.md` (D5) y
`bandadau-docs/docs/03-arquitectura/seguridad-y-sso.md` (D4).

## Identidad

Panel de administración (`admin.bandada.localhost`) y **host de microfrontends** (T2): autenticación
(login normal y **handoff SSO** desde la app, T13), navegación, layout, tema e idioma; páginas propias
(dashboard, usuarios y roles, universidades, SAGAs) y montaje en runtime de
`<bandada-mfe-moderation>` (Angular) y `<bandada-mfe-insights>` (React).

## Stack

Next.js 16 **static export** · React 19 · Tailwind CSS v4 · `@bandada/ui-tokens` · `@bandada/i18n`
(i18next + ICU) · TanStack Query + cliente GraphQL (`graphql-request` o `urql`, elegir y fijar aquí) ·
`graphql-ws` · `@bandada/contracts-ts` (tipos GraphQL generados) · Vitest · Playwright + axe.
Lee `node_modules/next/dist/docs/` antes de usar APIs de Next 16.

## Arquitectura y carpetas

```
bandadau-admin/shell/
├── app/
│   ├── layout.tsx  globals.css  error.tsx  global-error.tsx
│   ├── login/page.tsx
│   ├── sso/callback/page.tsx          exchangeHandoffCode (code + codeVerifier de #cv=)
│   └── (panel)/
│       ├── layout.tsx                 AuthGuard + Sidebar + Header (ThemeToggle, LanguageSwitcher)
│       ├── dashboard/  users/  universities/  sagas/
│       ├── moderation/[[...path]]/    monta <bandada-mfe-moderation>
│       └── insights/[[...path]]/      monta <bandada-mfe-insights>
├── src/
│   ├── mfe/                           manifest-loader.ts, MfeHost.tsx (props, eventos, fallback)
│   ├── components/ui/                 primitivas con tokens (Button, Card, DataTable, Modal, Toast…)
│   ├── features/{users,universities,sagas,dashboard}/   queries/mutations GraphQL
│   ├── lib/                           graphql-client.ts, query-client.ts, query-keys.ts, auth.ts, i18n.ts
│   └── stores/                        session.store.ts (Zustand)
├── public/mfe-manifest.json           (dev; en deploy se genera)
├── locales/{es,en}/{shell,users,…}.json
└── e2e/
```

Rutas con `[[...path]]` en static export: verificar soporte y, si no, usar ruta fija + `base-path` del MFE.

## Comandos (propuestos)

```bash
pnpm --filter admin-shell dev          # http://localhost:3001 (Traefik: admin.bandada.localhost)
pnpm --filter admin-shell build        # out/
pnpm --filter admin-shell lint && pnpm --filter admin-shell typecheck
pnpm --filter admin-shell test && pnpm --filter admin-shell test:e2e
pnpm --filter admin-shell i18n:check
```

## Variables de entorno (`.env.example`)

```
NEXT_PUBLIC_API_URL=http://api.bandada.localhost
NEXT_PUBLIC_GRAPHQL_URL=http://api.bandada.localhost/graphql
NEXT_PUBLIC_GRAPHQL_WS_URL=ws://api.bandada.localhost/graphql
NEXT_PUBLIC_APP_URL=http://app.bandada.localhost
NEXT_PUBLIC_MFE_MANIFEST_URL=/mfe-manifest.json
NEXT_PUBLIC_DEFAULT_LOCALE=es
```

## Puertos y contratos

Dev **3001**. GraphQL `bandadau-docs/contracts/graphql/admin.graphql` (queries `me`, `dashboard`, `users`,
`universities`, `sagas`, `serviceHealth`; mutations `updateUserRoles`, `suspendUser`, `reactivateUser`,
`createUniversity`, `runMonitoringNow`; subscription `alertRaised`). REST identity: `login`,
`exchangeHandoffCode`, `refreshToken`, `logout`, `updateMyPreferences`.

## Contrato shell ↔ MFE (D5)

Entradas: `graphql-url`, `access-token` (**propiedad**), `base-path`, `theme`, `locale`.
Salidas (`CustomEvent`): `bandada:navigate`, `bandada:toast`, `bandada:auth-expired`.
El shell carga `tokens.css` una vez (las variables atraviesan el Shadow DOM) y propaga cambios de
tema/idioma en caliente. Nada de estado global compartido.

## Reglas específicas y gotchas

- Static export: todo `'use client'`; sin SSR, API routes ni middleware.
- **Prohibido hex/paleta cruda**; solo tokens semánticos. Claro **y** oscuro obligatorios.
- **Prohibido texto literal**: `locales/{es,en}/<namespace>.json`. El cliente GraphQL/REST envía `Accept-Language`.
- Errores GraphQL mapeados por `extensions.code` con `@bandada/i18n`.
- Access token en memoria; refresh según `seguridad-y-sso.md`. `queryClient.clear()` en logout.
- Botón "Abrir en la app" → universal link `https://app.<dominio>/sso/callback?code=…` (D4).
- Un MFE que no carga muestra fallback con reintento y no rompe el shell.
- Solo roles `MODERATOR`/`ADMIN`; navegación filtrada por rol.

## Casos de uso

UC-03 (acceso sin re-login), UC-18/UC-19/UC-20 (hospeda MFEs y alertas en vivo), UC-21 (usuarios y roles).

## Definición de hecho

`definition-of-done.md` §0, §4, §5 (lado host) + E2E de handoff y de montaje de ambos MFEs en `es`/`en` y claro/oscuro.
