import { Injectable, signal } from '@angular/core';

export type ThemeName = 'light' | 'dark';
export type LocaleName = 'es' | 'en';

/**
 * Entradas del contrato shell ↔ MFE (microfrontends.md §3). El componente raíz las copia aquí
 * desde sus `input()`; el resto de la app (servicios, store) solo lee estas señales.
 * El token vive únicamente en memoria: nunca se persiste ni se escribe en el DOM.
 */
@Injectable({ providedIn: 'root' })
export class HostConfig {
  readonly graphqlUrl = signal('');
  readonly accessToken = signal<string | null>(null);
  readonly basePath = signal('/moderation');
  readonly theme = signal<ThemeName>('light');
  readonly locale = signal<LocaleName>('es');

  private waiters: Array<() => void> = [];

  /** Asigna el token y despierta a quien esperaba un token nuevo (reintento tras `auth-expired`). */
  setAccessToken(token: string | null): void {
    if (this.accessToken() === token) return;
    this.accessToken.set(token);
    const pending = this.waiters;
    this.waiters = [];
    for (const wake of pending) wake();
  }

  /** Resuelve `true` cuando el token difiere de `previous`; `false` si vence el plazo. */
  waitForTokenChange(previous: string | null, timeoutMs: number): Promise<boolean> {
    if (this.accessToken() !== previous) return Promise.resolve(true);
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
