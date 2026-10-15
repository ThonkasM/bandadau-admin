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

/** Tabla semántica y accesible (caption oculto, `scope="col"`), con skeleton, vacío y scroll horizontal. */
export function DataTable<T>({ caption, columns, rows, getRowId, loading = false, empty, skeletonRows = 6 }: DataTableProps<T>) {
  const showEmpty = !loading && rows.length === 0;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-start text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-default bg-surface-muted">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn('px-4 py-3 text-start text-xs font-semibold tracking-wide text-secondary uppercase', c.hideOnMobile && 'hidden md:table-cell', c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading &&
            rows.length === 0 &&
            Array.from({ length: skeletonRows }, (_, i) => (
              <tr key={`sk-${i}`} className="border-b border-default last:border-b-0">
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-4 py-3', c.hideOnMobile && 'hidden md:table-cell')}>
                    <Skeleton className="h-5 w-full max-w-40" />
                  </td>
                ))}
              </tr>
            ))}
          {rows.map((row) => (
            <tr key={getRowId(row)} className="border-b border-default transition-colors last:border-b-0 hover:bg-surface-muted">
              {columns.map((c) => (
                <td key={c.key} className={cn('px-4 py-3 align-middle text-primary', c.hideOnMobile && 'hidden md:table-cell', c.className)}>
                  {c.cell(row)}
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
