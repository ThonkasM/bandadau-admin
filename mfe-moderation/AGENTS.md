# AGENTS.md — mfe-moderation (F3)

Lee primero el `AGENTS.md` del workspace (`../../AGENTS.md`), el del repo (`../AGENTS.md`), `bandadau-docs/docs/04-patrones-y-reglas/frontend-guidelines.md` (§1, §3),
`design-tokens-y-temas.md` (§6.3), `i18n.md` y `bandadau-docs/docs/03-arquitectura/microfrontends.md` (D5).

## Identidad

Microfrontend de **moderación** (T2) publicado como Web Component `<bandada-mfe-moderation>`:
cola de contenido marcado por IA (imágenes/videos `FLAGGED`), denuncias de usuarios, decisión
`APPROVE/REJECT` con nota, actualización en vivo de la cola. Es la pieza **Angular** de la cátedra (C3).

## Stack

Angular 21 (standalone, **zoneless**, signals, control flow `@if/@for`) · `@angular/elements` ·
Transloco + MessageFormat (`@jsverse/transloco-messageformat`) · cliente GraphQL (Apollo Angular o
`HttpClient` + `graphql-ws`; elegir y fijar aquí) · `@bandada/ui-tokens` (`_tokens.scss` + CSS vars) ·
`@bandada/i18n` (JSON comunes) · runner de pruebas por defecto de Angular 21 (verificar) + Testing Library ·
Playwright. Verifica las APIs de Angular 21 (zoneless y elements) en la documentación oficial.

## Arquitectura y carpetas

```
bandadau-admin/mfe-moderation/
├── src/
│   ├── main.ts                       createApplication + createCustomElement → customElements.define
│   ├── element/                      moderation-root.component.ts (ShadowDom, @Input graphqlUrl, accessToken,
│   │                                 basePath, theme, locale; emite bandada:* CustomEvents)
│   ├── app/
│   │   ├── core/                     graphql.service.ts, auth-bridge.ts, i18n (Transloco loader), router interno
│   │   ├── features/
│   │   │   ├── moderation-queue/     lista, detalle con previsualización, decisión (moderateMedia)
│   │   │   └── content-reports/      lista y resolución (resolveContentReport)
│   │   └── shared/ui/                primitivas con var(--bd-…)
│   ├── locales/{es,en}/moderation.json
│   └── dev/index.html                modo standalone (carga tokens.css y un token de prueba)
├── angular.json  tsconfig.json
└── e2e/
```

## Comandos (propuestos)

```bash
pnpm --filter mfe-moderation dev        # http://localhost:4201 (standalone) — Traefik: mfe.bandada.localhost/moderation/
pnpm --filter mfe-moderation build      # dist/ → main.js (+ chunks) versionado
pnpm --filter mfe-moderation lint && pnpm --filter mfe-moderation test
pnpm --filter mfe-moderation test:e2e   # montado en el shell y standalone
pnpm --filter mfe-moderation i18n:check
```

## Variables de entorno (`.env.example`)

```
NG_APP_GRAPHQL_URL=http://api.bandada.localhost/graphql     # solo modo standalone; en el shell llega por propiedad
NG_APP_GRAPHQL_WS_URL=ws://api.bandada.localhost/graphql
NG_APP_DEFAULT_LOCALE=es
```

(El soporte de `NG_APP_*` depende del builder: verificar; alternativa `environment.ts` por configuración.)

## Puertos y contratos

Dev **4201**. GraphQL `bandadau-docs/contracts/graphql/admin.graphql`: `moderationQueue(filter, after, first)`,
`contentReports`, `moderateMedia(id, decision, note)`, `resolveContentReport`, subscription
`moderationQueueChanged`. Rol requerido `MODERATOR` o `ADMIN`.

## Contrato con el shell (D5)

Entradas `graphql-url`, `access-token` (propiedad, nunca atributo ni persistido), `base-path`, `theme`,
`locale`. Salidas `bandada:navigate`, `bandada:toast` (mensaje ya traducido o clave + params),
`bandada:auth-expired` (ante `UNAUTHENTICATED`). Sin estado global compartido.

## Reglas específicas y gotchas

- `ViewEncapsulation.ShadowDom` en el raíz; no cargar otra copia de `tokens.css` dentro del shell
  (solo en modo standalone).
- **Prohibido hex/paleta cruda**: solo `var(--bd-…)` semánticos; claro **y** oscuro, reaccionando al atributo `theme`.
- **Prohibido texto literal** en plantillas: `{{ 'moderation.queue.title' | transloco }}` / `*transloco`;
  idioma desde el atributo `locale` en caliente. El cliente GraphQL envía `Accept-Language`.
- Errores mapeados por `extensions.code` (`@bandada/i18n/errors`).
- Zoneless: todo estado en signals; nada de `setTimeout` para forzar detección.
- Previsualizaciones de medios por URL prefirmada (pueden expirar: refrescar con la query).
- Bundle objetivo < 300 KB gzip; versión SemVer en `package.json` y `mfe-manifest.json`.

## Casos de uso

UC-18 (moderar contenido marcado por IA), UC-10 (resolver denuncias).

## Definición de hecho

`definition-of-done.md` §0, §4, §5 + E2E montado en el shell (aprobar/rechazar) en `es`/`en` y claro/oscuro.
