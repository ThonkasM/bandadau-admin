// Verifica es/en de los catálogos del MFE junto con los comunes de @bandada/i18n (common, enums, errors):
// paridad de claves, ICU válido, mismos placeholders y que toda clave usada en `src` exista.
// El CLI de @bandada/i18n solo mira un directorio, así que se arma uno combinado en node_modules/.cache.
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'package.json'));
const shared = join(dirname(require.resolve('@bandada/i18n/package.json')), 'locales');
const merged = join(root, 'node_modules', '.cache', 'i18n-check');

rmSync(merged, { recursive: true, force: true });
for (const locale of ['es', 'en']) {
  mkdirSync(join(merged, locale), { recursive: true });
  cpSync(join(shared, locale), join(merged, locale), { recursive: true });
  cpSync(join(root, 'src/assets/i18n', locale), join(merged, locale), { recursive: true });
}

const cli = join(dirname(require.resolve('@bandada/i18n/package.json')), 'bin/bandada-i18n-check.mjs');
const result = spawnSync(process.execPath, [cli, merged, '--src', join(root, 'src')], { encoding: 'utf8' });

// Claves que se resuelven dinámicamente (`'moderation.toast.' + kind`) y las de los catálogos compartidos
// no se pueden marcar como "usadas" estáticamente: se resumen en vez de listarse.
const dynamic = /^warn {2}unused key (moderation:((dialog|toast|errors|actions|type|live|filters)\.|states\.waitingSession|detail\.(titleMedia|titleReport|show|hide))|common:|enums:|errors:)/;
const lines = `${result.stdout}${result.stderr}`.split('\n').filter(Boolean);
const suppressed = lines.filter((l) => dynamic.test(l)).length;
for (const line of lines.filter((l) => !dynamic.test(l))) console.log(line);
if (suppressed > 0) console.log(`(${suppressed} avisos "unused key" de claves dinámicas o compartidas omitidos)`);
process.exit(result.status ?? 1);
