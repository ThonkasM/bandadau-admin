// Genera out/mfe-manifest.json para producción/staging (el pipeline de despliegue lo sube con `no-store`).
//   BASE_DOMAIN=bandadau.com MODERATION_VERSION=1.2.0 MODERATION_INTEGRITY=sha384-… node scripts/write-manifest.mjs
import fs from 'node:fs';
import path from 'node:path';

const domain = process.env.BASE_DOMAIN ?? 'bandada.localhost';
const scheme = process.env.MFE_SCHEME ?? (domain.endsWith('.localhost') ? 'http' : 'https');
const entry = (name, element, roles, version, integrity) => ({
  url: `${scheme}://mfe.${domain}/${name}/${version}/main.js`,
  element,
  version,
  ...(integrity ? { integrity } : {}),
  requiredRoles: roles,
  basePath: `/${name}`,
});
const manifest = {
  moderation: entry('moderation', 'bandada-mfe-moderation', ['MODERATOR', 'ADMIN'], process.env.MODERATION_VERSION ?? '0.1.0', process.env.MODERATION_INTEGRITY),
  insights: entry('insights', 'bandada-mfe-insights', ['ADMIN'], process.env.INSIGHTS_VERSION ?? '0.1.0', process.env.INSIGHTS_INTEGRITY),
};
const out = path.resolve(process.argv[2] ?? 'out/mfe-manifest.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`wrote ${out}`);
