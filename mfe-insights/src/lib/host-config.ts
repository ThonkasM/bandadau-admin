export type ThemeName = 'light' | 'dark';
export type LocaleName = 'es' | 'en';
/** Vista del panel: `summary` (gerencial) o `detail` (completa; por defecto, compatible con shells anteriores). */
export type ViewName = 'summary' | 'detail';

export interface HostSnapshot {
  readonly graphqlUrl: string;
  readonly accessToken: string | null;
  readonly basePath: string;
  readonly theme: ThemeName;
  readonly locale: LocaleName;
  readonly view: ViewName;
}

/**
 * Entradas del contrato shell ↔ MFE (microfrontends.md §3). El custom element las copia aquí; el resto
 * de la app solo lee (`useSyncExternalStore`). El token vive únicamente en memoria: nunca se persiste
 * ni se escribe en el DOM.
 */
export class HostConfig {
  private snapshot: HostSnapshot = {
    graphqlUrl: '',
    accessToken: null,
    basePath: '/insights',
    theme: 'light',
    locale: 'es',
    view: 'detail',
  };
  private listeners = new Set<() => void>();
  private waiters: Array<() => void> = [];

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getSnapshot = (): HostSnapshot => this.snapshot;

  get graphqlUrl(): string {
    return this.snapshot.graphqlUrl;
  }
  get accessToken(): string | null {
    return this.snapshot.accessToken;
  }
  get locale(): LocaleName {
    return this.snapshot.locale;
  }
  get theme(): ThemeName {
    return this.snapshot.theme;
  }

  update(patch: Partial<HostSnapshot>): void {
    const next = { ...this.snapshot, ...patch };
    const changed = (Object.keys(next) as Array<keyof HostSnapshot>).some((k) => next[k] !== this.snapshot[k]);
    if (!changed) return;
    const tokenChanged = next.accessToken !== this.snapshot.accessToken;
    this.snapshot = next;
    if (tokenChanged) {
      const pending = this.waiters;
      this.waiters = [];
      for (const wake of pending) wake();
    }
    for (const listener of [...this.listeners]) listener();
  }

  /** Resuelve `true` cuando el token difiere de `previous`; `false` si vence el plazo. */
  waitForTokenChange(previous: string | null, timeoutMs: number): Promise<boolean> {
    if (this.snapshot.accessToken !== previous) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((w) => w !== wake);
        resolve(false);
      }, timeoutMs);
      const wake = () => {
        clearTimeout(timer);
        resolve(true);
      };
      this.waiters.push(wake);
    });
  }
}

export const normalizeLocale = (value: unknown): LocaleName => (value === 'en' ? 'en' : 'es');
export const normalizeTheme = (value: unknown): ThemeName => (value === 'dark' ? 'dark' : 'light');
