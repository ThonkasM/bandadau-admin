import { Injectable, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastDetail {
  kind: ToastKind;
  messageKey?: string;
  message?: string;
}

/**
 * Eventos hacia el shell (`bandada:*`). Siempre `bubbles` + `composed` para atravesar el Shadow DOM.
 * Se despachan sobre el elemento anfitrión (`<bandada-mfe-moderation>`).
 */
@Injectable({ providedIn: 'root' })
export class ShellBridge {
  private readonly i18n = inject(TranslocoService);
  private target: EventTarget | null = null;

  attach(target: EventTarget | null): void {
    this.target = target;
  }

  emit<T>(type: string, detail: T): void {
    this.target?.dispatchEvent(new CustomEvent<T>(type, { detail, bubbles: true, composed: true }));
  }

  navigate(path: string, replace = false): void {
    this.emit('bandada:navigate', { path, replace });
  }

  /** `messageKey` + `message` ya traducido al idioma activo (el shell usa el que prefiera). */
  toast(kind: ToastKind, messageKey: string, params?: Record<string, unknown>): string {
    const message = this.i18n.translate(messageKey, params);
    this.emit<ToastDetail>('bandada:toast', { kind, messageKey, message });
    return message;
  }

  authExpired(): void {
    this.emit('bandada:auth-expired', {});
  }
}
