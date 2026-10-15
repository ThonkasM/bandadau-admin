// Reglas de estilo del proyecto: nada de colores crudos (hex/rgb/hsl) ni paleta cruda en la UI del MFE.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../src', import.meta.url).pathname;
const RAW = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;
const bad = [];
function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(css|ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) {
      readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
        if (RAW.test(line.replace(/&#\d+;/g, ''))) bad.push(`${p}:${i + 1}: ${line.trim()}`);
      });
    }
  }
}
walk(root);
if (bad.length) {
  console.error(`Colores crudos prohibidos (usa var(--bd-*)):\n${bad.join('\n')}`);
  process.exit(1);
}
console.log('style-rules ok: sin hex/rgb/hsl en src/');
