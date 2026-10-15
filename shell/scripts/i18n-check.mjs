// i18n:check del shell: paridad es/en, ICU válido, placeholders iguales y claves usadas que existen.
// Los catálogos compartidos (@bandada/i18n: common, enums, errors) se mezclan con los del shell para poder
// validar claves como `common:actions.save` o `enums:Role.ADMIN`.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkLocales } from '@bandada/i18n/scripts/i18n-check';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shared = path.join(root, 'node_modules/@bandada/i18n/locales');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bandada-shell-i18n-'));

try {
  for (const locale of ['es', 'en']) {
    fs.mkdirSync(path.join(tmp, 'locales', locale), { recursive: true });
    for (const dir of [path.join(shared, locale), path.join(root, 'locales', locale)]) {
      for (const file of fs.readdirSync(dir)) fs.copyFileSync(path.join(dir, file), path.join(tmp, 'locales', locale, file));
    }
  }
  for (const dir of ['src', 'app']) fs.cpSync(path.join(root, dir), path.join(tmp, 'src', dir), { recursive: true });

  const { errors, warnings } = await checkLocales({ dir: path.join(tmp, 'locales'), srcDir: path.join(tmp, 'src') });

  // Se ignoran los avisos "unused" de los catálogos compartidos y de claves dinámicas (enums, series, apiErrors…).
  const dynamic = /^unused key (common|enums|errors):|^unused key shell:(apiErrors|theme|localeName|mfe\.errors|nav\.(groups|items))\.|^unused key dashboard:series\./;
  const relevant = warnings.filter((w) => !dynamic.test(w));
  for (const w of relevant) console.warn(`warn  ${w}`);
  for (const e of errors) console.error(`error ${e}`);
  if (errors.length > 0) {
    console.error(`i18n-check failed: ${errors.length} error(s)`);
    process.exitCode = 1;
  } else {
    console.log(`i18n-check ok (${relevant.length} warning(s))`);
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
