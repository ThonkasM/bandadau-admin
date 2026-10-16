// i18n:check: paridad es/en, ICU válido, placeholders iguales y claves usadas que existen.
// Los catálogos compartidos (@bandada/i18n: common, enums, errors) se mezclan con los del MFE para poder
// validar claves como `common:actions.save` o `enums:AlertSeverity.CRITICAL`.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkLocales } from '@bandada/i18n/scripts/i18n-check';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shared = path.join(root, 'node_modules/@bandada/i18n/locales');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bandada-insights-i18n-'));

try {
  for (const locale of ['es', 'en']) {
    fs.mkdirSync(path.join(tmp, 'locales', locale), { recursive: true });
    for (const dir of [path.join(shared, locale), path.join(root, 'src/locales', locale)]) {
      for (const file of fs.readdirSync(dir)) fs.copyFileSync(path.join(dir, file), path.join(tmp, 'locales', locale, file));
    }
  }
  fs.cpSync(path.join(root, 'src'), path.join(tmp, 'src'), { recursive: true });

  const { errors, warnings } = await checkLocales({ dir: path.join(tmp, 'locales'), srcDir: path.join(tmp, 'src') });

  // Claves resueltas dinámicamente (`alerts.kind.${kind}`, `runs.trigger.*`, `reports.failure.*`, `alerts.live.${state}`…),
  // pasadas como cadena a `bridge.toast('insights:…')` o ambiguas con los catálogos compartidos, y los catálogos compartidos.
  const dynamic =
    /^unused key (common|enums|errors):|^unused key insights:(alerts\.(kind|live)\.|alerts\.(acknowledged|newAlert|runDone|runFailed)$|reports\.(failure|toast|catalog|form\.language|dictation\.(errors|unsupported))\.|reports\.detail\.(copied|copyFailed|modelTag\.\w+)$|runs\.(trigger|stopReasonValue|stepKind)\.|errors\.)/;
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
