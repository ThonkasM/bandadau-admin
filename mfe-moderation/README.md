# mfe-moderation

Microfrontend de moderación (`<bandada-mfe-moderation>`, Angular 21 zoneless + Angular Elements): cola de contenido marcado por IA y denuncias (UC-18, UC-10).

| | |
|---|---|
| Puerto dev | 4201 (CORS abierto) · despliegue `mfe.<dominio>/moderation/<versión>/main.js` |
| Proyecto | **Independiente** (su `package.json` y `pnpm-lock.yaml`; sin workspace). pnpm 10 vía Corepack |
| Compartidos | `file:../../bandadau-shared/packages/{ui-tokens,i18n,contracts-ts,eslint-config}` → compila antes `cd ../../bandadau-shared && corepack pnpm install --frozen-lockfile && corepack pnpm build` |

## Comandos

```bash
corepack pnpm install
corepack pnpm start        # http://localhost:4201 — host de prueba que simula al shell (tema, idioma, token, URL)
corepack pnpm build        # dist/mfe-moderation/main.js (ES module único, ~91 KB gzip) + mfe-manifest-entry.json (con SRI)
corepack pnpm test         # Vitest (runner por defecto de Angular 21) + validación de operaciones contra admin.graphql
corepack pnpm lint         # ESLint (@bandada/eslint-config/angular + angular-eslint) + sin hex/rgb/hsl en src
corepack pnpm typecheck
corepack pnpm i18n:check   # paridad es/en, ICU, claves usadas (catálogos propios + @bandada/i18n)
corepack pnpm mock         # gateway mock propio mínimo (alternativa a `make mock` de bandadau-infra)
```

Backend: `make mock` en `bandadau-infra` (http://localhost:4010/graphql). El host de prueba pide el token
con el login REST del mock (`mod@umsa.edu.bo`, usuario demo del seed local); con el mock propio (`pnpm mock`)
sirve `dev-moderator-token` / `dev-admin-token`. Parámetros: `?gql=…&theme=dark&locale=en&keys=j,a`.

## Contrato con el shell

Entradas: `graphql-url`, `base-path`, `theme` (`light|dark`), `locale` (`es|en`) como atributos/propiedades;
`accessToken` **solo propiedad** (no se observa como atributo). Salidas (`bubbles` + `composed`):
`bandada:navigate`, `bandada:toast` (`{kind, messageKey, message}` ya traducido), `bandada:auth-expired`
(ante `UNAUTHENTICATED`; una vez por token, reintenta cuando el shell reasigna `accessToken`).
El atributo `theme` se refleja en `data-theme` del anfitrión, lo que activa el bloque claro/oscuro de
`tokens.css` (cargado una sola vez por el shell; las variables `--bd-*` atraviesan el Shadow DOM).

Capturas en `docs/screenshots/`. Detalles de arquitectura, decisiones y divergencias: [`AGENTS.md`](AGENTS.md).
