// Valida las operaciones GraphQL del MFE contra el SDL real del contrato (contract-first).
import { existsSync, readFileSync } from 'node:fs';
import { buildSchema, parse, validate } from 'graphql';

const sdl = new URL('../../../bandadau-docs/contracts/graphql/admin.graphql', import.meta.url);
if (!existsSync(sdl)) {
  console.warn('contract check omitido: no existe bandadau-docs/contracts/graphql/admin.graphql');
  process.exit(0);
}
const schema = buildSchema(readFileSync(sdl, 'utf8'));
const ops = await import('../src/lib/operations.ts');
let failed = 0;
let count = 0;
for (const [name, doc] of Object.entries(ops)) {
  if (!/^\s*(query|mutation|subscription)\b/.test(doc)) continue;
  count += 1;
  const errors = validate(schema, parse(doc));
  if (errors.length) {
    failed += 1;
    console.error(`${name}: ${errors.map((e) => e.message).join('; ')}`);
  }
}
if (failed) process.exit(1);
console.log(`contract ok: ${count} operaciones válidas contra admin.graphql`);
