import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';

import { provideI18n } from './i18n';
import { ShellBridge } from './shell-bridge';

describe('ShellBridge (eventos hacia el shell)', () => {
  let bridge: ShellBridge;
  let outer: HTMLElement;
  let inner: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideI18n()] });
    bridge = TestBed.inject(ShellBridge);
    // El anfitrión (inner) vive dentro de un contenedor del "shell" (outer): el evento debe burbujear.
    outer = document.createElement('div');
    inner = document.createElement('bandada-mfe-test');
    outer.append(inner);
    document.body.append(outer);
    bridge.attach(inner);
  });

  afterEach(() => outer.remove());

  it('emits bandada:navigate with bubbles + composed', () => {
    const seen: CustomEvent[] = [];
    outer.addEventListener('bandada:navigate', (e) => seen.push(e as CustomEvent));
    bridge.navigate('/queue/123', true);
    expect(seen).toHaveLength(1);
    expect(seen[0]!.detail).toEqual({ path: '/queue/123', replace: true });
    expect(seen[0]!.bubbles).toBe(true);
    expect(seen[0]!.composed).toBe(true);
  });

  it('emits bandada:toast with the key and the message already translated', () => {
    const seen: CustomEvent[] = [];
    outer.addEventListener('bandada:toast', (e) => seen.push(e as CustomEvent));
    const i18n = TestBed.inject(TranslocoService);

    i18n.setActiveLang('es');
    bridge.toast('success', 'moderation.toast.APPROVE');
    i18n.setActiveLang('en');
    bridge.toast('error', 'moderation.errors.ALREADY_MODERATED');

    expect(seen[0]!.detail).toEqual({ kind: 'success', messageKey: 'moderation.toast.APPROVE', message: 'Contenido aprobado' });
    expect(seen[1]!.detail.kind).toBe('error');
    expect(seen[1]!.detail.message).toContain('Another moderator');
    expect(seen[1]!.composed).toBe(true);
  });

  it('emits bandada:auth-expired with an empty detail', () => {
    const seen: CustomEvent[] = [];
    outer.addEventListener('bandada:auth-expired', (e) => seen.push(e as CustomEvent));
    bridge.authExpired();
    expect(seen[0]!.detail).toEqual({});
    expect(seen[0]!.bubbles && seen[0]!.composed).toBe(true);
  });

  it('does nothing when detached', () => {
    bridge.attach(null);
    expect(() => bridge.authExpired()).not.toThrow();
  });
});
