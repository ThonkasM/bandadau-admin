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

Next.js **16.4** static export · React 19 · Tailwind CSS v4 · `@bandada/ui-tokens` · `@bandada/i18n` (i18next 26 +
`i18next-icu`) · cliente GraphQL **urql** (`@urql/core` 6, `@urql/exchange-auth`; subscriptions con `graphql-ws` 6) ·
Zustand (sesión, tema, toasts) · `@bandada/contracts-ts/graphql/admin` (tipos) · Vitest 5 + Testing Library.
Decisión fijada: **urql** (no `graphql-request`+TanStack Query); REST de auth con `fetch` propio (`src/lib/http.ts`).
Proyecto **independiente**: su `package.json` y `pnpm-lock.yaml`, sin workspace en la raíz del repo; `@bandada/*` con
`file:../../bandadau-shared/packages/<pkg>` (compila shared antes; tras cambiar shared, `pnpm install --force`).

## Arquitectura y carpetas

```
app/                      layout (themeScript en <head>), globals.css, error/global-error/not-found, login/, sso/callback/
app/(panel)/              layout = AuthGuard + GraphQLProvider + Shell; dashboard, users(+detail), universities, events(+detail),
                          sagas, moderation, insights, reports  (detalles con ?id= porque static export no conoce los ids)
src/components/ui/        Button Card Field(Input/Select/Textarea/Checkbox) Switch Badge Modal DataTable Pagination Toast
                          EmptyState ErrorState Skeleton PageHeader ThemeToggle LanguageSwitcher
src/components/layout/    Shell Sidebar(colapsable) Header Breadcrumbs UserMenu guards(AuthGuard/RoleGuard) ErrorBoundary nav.ts
src/features/<x>/         graphql.ts (documentos + tipos) y páginas: dashboard, users, universities, events, sagas, auth, insights
src/mfe/                  manifest-loader.ts, MfeHost.tsx, MfeFallback.tsx
src/lib/auth/             session-store (token EN MEMORIA), session (login/refresh single-flight/logout), sso (PKCE, #cv)
src/lib/graphql/          client.ts (urql + auth + ws), errors.ts (código → texto i18n)
src/lib/{i18n,theme}/     i18next, idioma (resolveLocale), tema (SYSTEM/LIGHT/DARK + sync con la cuenta)
locales/{es,en}/          shell, auth, dashboard, users, universities, events (+ common/enums/errors de @bandada/i18n)
public/mfe-manifest.json  dev → http://localhost:4201/main.js ; prod: `pnpm manifest:prod` (mfe.<BASE_DOMAIN>)
scripts/                  i18n-check.mjs, write-manifest.mjs     dev/serve-mfe.mjs (estático con CORS para un dist de MFE)
```

## Comandos

```bash
corepack pnpm install
corepack pnpm dev            # http://localhost:3001 (uso normal vía Traefik: http://admin.bandada.localhost)
corepack pnpm build          # export estático → out/
corepack pnpm typecheck && corepack pnpm lint && corepack pnpm test && corepack pnpm i18n:check
corepack pnpm mfe:serve      # sirve ../mfe-moderation/dist/mfe-moderation en :4201 con CORS
corepack pnpm manifest:prod  # out/mfe-manifest.json con BASE_DOMAIN/versiones/SRI
```

## Variables de entorno (`.env.example`)

`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_GRAPHQL_URL`, `NEXT_PUBLIC_GRAPHQL_WS_URL`, `NEXT_PUBLIC_APP_URL`,
`NEXT_PUBLIC_MFE_MANIFEST_URL`, `NEXT_PUBLIC_DEFAULT_LOCALE`, `NEXT_PUBLIC_FEATURE_INSIGHTS` (false en fase 1).

## Desarrollo: sitio, cookie y mock

- La cookie de refresh es `HttpOnly; SameSite=Strict` y la fija el API: el shell y el API deben ser la **misma "site"**.
  Camino normal: Traefik → `http://admin.bandada.localhost` + `http://api.bandada.localhost` (`make up` en `bandadau-infra`;
  el router `admin-shell` apunta a `host.docker.internal:3001`). Si `*.localhost` no resuelve (Safari/Linux), añade los hosts
  de `make urls`. `make host S=<servicio>` (infra) solo redirige un *servicio* a tu IDE; el shell ya corre en el host.
- Alternativa sin Traefik: `http://localhost:3001` contra el mock (`localhost:<puerto>` es la misma site). Crea `.env.local` (ignorado):
  `NEXT_PUBLIC_API_URL=http://localhost:4010`, `NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4010/graphql`,
  `NEXT_PUBLIC_GRAPHQL_WS_URL=ws://localhost:4010/graphql`. Mock: `make mock` en `bandadau-infra` (usuarios `admin|mod@umsa.edu.bo`, clave de dev del plan de fase 1).
- El `alerts`/`alertRaised` de insights responden `FEATURE_DISABLED` en fase 1: el dashboard lo muestra como "fase 2", no como error.

## Contrato shell ↔ MFE (D5)

Entradas: `graphql-url` (propiedad y atributo), `access-token` (**solo propiedad**), `base-path`, `theme` (resuelto), `locale`.
Salidas (`CustomEvent`, `bubbles+composed`): `bandada:navigate`, `bandada:toast`, `bandada:auth-expired`; el shell envía
`bandada:theme-changed`/`locale-changed` además de actualizar el atributo. `MfeHost` carga `<script type=module>` (SRI si hay
`integrity`), timeout 10 s, fallback con reintento. Static export no admite `[[...path]]`: la sub-ruta del MFE viaja en
`/moderation/?path=…` (el shell la actualiza al recibir `bandada:navigate`).

## Puertos y contratos

Dev **3001**. GraphQL `bandadau-docs/contracts/graphql/admin.graphql` (queries `me`, `dashboard`, `users`,
`universities`, `sagas`, `serviceHealth`; mutations `updateUserRoles`, `suspendUser`, `reactivateUser`,
`createUniversity`, `runMonitoringNow`; subscription `alertRaised`). REST identity: `login`,
`exchangeHandoffCode`, `refreshToken`, `logout`, `updateMyPreferences`.

## Reglas específicas y gotchas

- Static export: todo `'use client'`; sin SSR, API routes ni middleware.
- **Prohibido hex/paleta cruda**; solo tokens semánticos. Claro **y** oscuro obligatorios.
- **Prohibido texto literal**: `locales/{es,en}/<namespace>.json`. El cliente GraphQL/REST envía `Accept-Language`.
- Errores GraphQL mapeados por `extensions.code` con `@bandada/i18n`.
- Access token en memoria; refresh por cookie (`POST /auth/refresh`, `X-Bandada-Client: admin`, `credentials:'include'`, single-flight + Web Locks). Logout/login recrean el cliente urql (`epoch`) y vacían su caché.
- `updateUniversity` no existe en `admin.graphql`: la edición de dominios está deshabilitada hasta que se agregue al contrato.
- Lint (`react-hooks` v7) prohíbe `setState` en efectos: derivar estado o usar inicializadores.
- Botón "Abrir en la app" → universal link `https://app.<dominio>/sso/callback?code=…` (D4).
- Un MFE que no carga muestra fallback con reintento y no rompe el shell.
- Solo roles `MODERATOR`/`ADMIN`; navegación filtrada por rol.

## Casos de uso

UC-03 (acceso sin re-login), UC-18/UC-19/UC-20 (hospeda MFEs y alertas en vivo), UC-21 (usuarios y roles).

## Definición de hecho

`definition-of-done.md` §0, §4, §5 (lado host) + E2E de handoff y de montaje de ambos MFEs en `es`/`en` y claro/oscuro.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
