// Tras `ng build`: calcula el SRI de main.js y genera dist/mfe-moderation/mfe-manifest-entry.json
// (entrada de ejemplo para el `mfe-manifest.json` del shell; microfrontends.md §2 y §10).
import { createHash } from 'node:crypto';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist', 'mfe-moderation');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const main = readFileSync(join(dist, 'main.js'));
const integrity = `sha384-${createHash('sha384').update(main).digest('base64')}`;
const base = process.env.MFE_PUBLIC_BASE ?? 'https://mfe.bandadau.com/moderation';

const entry = {
  moderation: {
    url: `${base}/${pkg.version}/main.js`,
    element: 'bandada-mfe-moderation',
    version: pkg.version,
    integrity,
    requiredRoles: ['MODERATOR', 'ADMIN'],
    basePath: '/moderation',
  },
};
writeFileSync(join(dist, 'mfe-manifest-entry.json'), `${JSON.stringify(entry, null, 2)}\n`);
rmSync(join(dist, 'prerendered-routes.json'), { force: true });
console.log(`mfe-manifest-entry.json -> ${entry.moderation.url} (${(main.length / 1024).toFixed(1)} KB, ${integrity.slice(0, 22)}…)`);
