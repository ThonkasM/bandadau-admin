import { create } from 'zustand';

/** `summary` = vista gerencial (pocas cifras, un gráfico); `detail` = todos los datos y tablas. */
export type ViewMode = 'summary' | 'detail';

const STORAGE_KEY = 'bandada.admin.view';

interface ViewModeState {
  mode: ViewMode;
  hydrated: boolean;
  setMode: (mode: ViewMode) => void;
  /** Lee la preferencia guardada (solo en el cliente, tras montar: evita desajustes de hidratación). */
  hydrate: () => void;
}

export const useViewMode = create<ViewModeState>((set, get) => ({
  mode: 'summary',
  hydrated: false,
  setMode: (mode) => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* almacenamiento no disponible */
    }
    set({ mode });
  },
  hydrate: () => {
    if (get().hydrated) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'summary' || stored === 'detail') set({ mode: stored, hydrated: true });
      else set({ hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
}));
