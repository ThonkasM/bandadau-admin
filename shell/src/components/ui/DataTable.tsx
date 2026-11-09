import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { Skeleton } from './Skeleton';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  /** Oculta la columna en pantallas pequeñas. */
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  loading?: boolean;
  /** Contenido cuando no hay filas (se pasa un `EmptyState`). */
  empty?: ReactNode;
  skeletonRows?: number;
}

/**
 * Tabla semántica y accesible (caption oculto, `scope="col"`), con skeleton y vacío.
 * En pantallas pequeñas (< md) cada fila se muestra como tarjeta «etiqueta: valor» (sin scroll horizontal ni
 * texto partido letra por letra); desde md es una tabla normal con scroll horizontal si no cabe.
 */
export function DataTable<T>({ caption, columns, rows, getRowId, loading = false, empty, skeletonRows = 6 }: DataTableProps<T>) {
  const showEmpty = !loading && rows.length === 0;
  const rowClass = 'mb-3 block rounded-lg border border-default p-3 transition-colors last:mb-0 hover:bg-surface-muted md:mb-0 md:table-row md:rounded-none md:border-0 md:border-b md:p-0 md:last:border-b-0';
  const cellBase = 'flex items-start justify-between gap-3 py-1.5 md:table-cell md:px-4 md:py-3 md:align-middle';
  return (
    <div className="relative md:overflow-x-auto">
      <table className="block w-full border-collapse text-start text-sm md:table">
        <caption className="sr-only">{caption}</caption>
        <thead className="hidden md:table-header-group">
          <tr className="border-b border-default bg-surface-muted">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn('px-4 py-3 text-start text-xs font-semibold tracking-wide text-secondary uppercase', c.hideOnMobile && 'hidden md:table-cell', c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="block md:table-row-group">
          {loading &&
            rows.length === 0 &&
            Array.from({ length: skeletonRows }, (_, i) => (
              <tr key={`sk-${i}`} className={rowClass}>
                {columns.map((c) => (
                  <td key={c.key} className={cn(cellBase, c.hideOnMobile && 'hidden md:table-cell')}>
                    <Skeleton className="h-5 w-full max-w-40" />
                  </td>
                ))}
              </tr>
            ))}
          {rows.map((row) => (
            <tr key={getRowId(row)} className={rowClass}>
              {columns.map((c) => (
                <td key={c.key} className={cn(cellBase, 'text-primary', c.hideOnMobile && 'hidden md:table-cell', c.className)}>
                  <span className="shrink-0 text-xs font-semibold tracking-wide text-muted uppercase empty:hidden md:hidden">{c.header}</span>
                  <div className="min-w-0 break-words max-md:text-end md:contents">{c.cell(row)}</div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {showEmpty && empty}
    </div>
  );
}
