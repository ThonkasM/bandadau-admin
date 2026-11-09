const BOM = String.fromCharCode(0xfeff);

/** Escapa una celda CSV (comillas, comas y saltos de línea). */
const cell = (value: string | number | null | undefined): string => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** CSV con BOM UTF-8 para que Excel respete las tildes. */
export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  return `${BOM}${[headers, ...rows].map((row) => row.map(cell).join(',')).join('\r\n')}\r\n`;
}

/** Descarga un CSV en el navegador. */
export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number | null | undefined>>): void {
  const url = URL.createObjectURL(new Blob([toCsv(headers, rows)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
