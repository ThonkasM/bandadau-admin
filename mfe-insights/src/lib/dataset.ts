import type { Dataset } from './types';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Normaliza `{ columns: [...], rows: [[...]] }` (contrato) aceptando columnas como `string` o `{ name }`
 * y filas como arreglos u objetos. Devuelve `null` si no hay forma tabular utilizable.
 */
export function normalizeDataset(raw: unknown): Dataset | null {
  if (!isRecord(raw) || !Array.isArray(raw['columns']) || !Array.isArray(raw['rows'])) return null;
  const columns = (raw['columns'] as unknown[]).map((c) => (isRecord(c) ? String(c['name'] ?? '') : String(c)));
  if (columns.length === 0) return null;
  const rows = (raw['rows'] as unknown[]).map((row) =>
    isRecord(row) ? columns.map((c) => row[c]) : Array.isArray(row) ? (row as unknown[]) : [],
  );
  return { columns, rows };
}

export function datasetToObjects(dataset: Dataset): Array<Record<string, unknown>> {
  return dataset.rows.map((row) => Object.fromEntries(dataset.columns.map((c, i) => [c, row[i] ?? null])));
}

const csvCell = (value: unknown): string => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export function datasetToCsv(dataset: Dataset): string {
  return [dataset.columns, ...dataset.rows].map((row) => row.map(csvCell).join(',')).join('\n');
}
