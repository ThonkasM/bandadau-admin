// Tras `vite build`: calcula el SRI de main.js y genera dist/mfe-insights/mfe-manifest-entry.json
// (entrada de ejemplo para el `mfe-manifest.json` del shell; microfrontends.md §2 y §10).
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist', 'mfe-insights');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const main = readFileSync(join(dist, 'main.js'));
const integrity = `sha384-${createHash('sha384').update(main).digest('base64')}`;
const base = process.env.MFE_PUBLIC_BASE ?? 'https://mfe.bandadau.com/insights';

const entry = {
  insights: {
    url: `${base}/${pkg.version}/main.js`,
    element: 'bandada-mfe-insights',
    version: pkg.version,
    integrity,
    requiredRoles: ['ADMIN'],
    basePath: '/insights',
  },
};
writeFileSync(join(dist, 'mfe-manifest-entry.json'), `${JSON.stringify(entry, null, 2)}\n`);

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const sizes = readdirSync(dist)
  .filter((f) => f.endsWith('.js'))
  .map((f) => {
    const buf = readFileSync(join(dist, f));
    return `${f} ${kb(buf.length)} (gzip ${kb(gzipSync(buf).length)})`;
  });
console.log(`mfe-manifest-entry.json -> ${entry.insights.url} (${integrity.slice(0, 22)}…)`);
console.log(sizes.join('\n'));
const gz = gzipSync(main).length;
if (gz > 300 * 1024) {
  console.error('main.js supera 300 KB gzip: mover más dependencias a chunks diferidos.');
  process.exit(1);
}
