import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: push }) }));
vi.mock('@/lib/auth/session', () => ({ refreshAccessToken: vi.fn(async () => 'fresh-token') }));

import { useSession } from '@/lib/auth/session-store';

import { resetMfeCache } from './manifest-loader';
import { MfeHost } from './MfeHost';

const entry = { url: 'http://mfe.test/main.js', element: 'bandada-mfe-test', version: '1.0.0', basePath: '/moderation' };

function stubManifest(ok = true) {
  vi.stubGlobal('fetch', vi.fn(async () => (ok ? new Response(JSON.stringify({ moderation: entry })) : new Response('x', { status: 500 }))));
}

describe('MfeHost', () => {
  beforeEach(() => {
    resetMfeCache();
    document.head.querySelectorAll('script[data-mfe]').forEach((n) => n.remove());
    push.mockClear();
    useSession.setState({ status: 'authenticated', accessToken: 'tok', user: { id: '1', roles: ['ADMIN'], email: 'a@b.c' } as never });
  });

  it('monta el elemento con propiedades, atributos y eventos', async () => {
    stubManifest();
    customElements.define('bandada-mfe-test', class extends HTMLElement {});
    const spy = vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
      queueMicrotask(() => (node as HTMLScriptElement).onload?.(new Event('load')));
      return node;
    });
    render(<MfeHost name="moderation" />);
    const el = await waitFor(() => {
      const found = document.querySelector('bandada-mfe-test');
      expect(found).not.toBeNull();
      return found as HTMLElement & { accessToken: string; graphqlUrl: string };
    });
    expect(el.accessToken).toBe('tok');
    expect(el.hasAttribute('access-token')).toBe(false);
    expect(el.getAttribute('base-path')).toBe('/moderation');
    expect(el.getAttribute('theme')).toBeTruthy();
    expect(el.getAttribute('locale')).toBe('es');
    expect((spy.mock.calls[0]![0] as HTMLScriptElement).type).toBe('module');

    act(() => {
      el.dispatchEvent(new CustomEvent('bandada:navigate', { detail: { path: '/queue/1' }, bubbles: true, composed: true }));
    });
    expect(push).toHaveBeenCalledWith('/moderation/?path=%2Fqueue%2F1');

    await act(async () => {
      el.dispatchEvent(new CustomEvent('bandada:auth-expired', { bubbles: true, composed: true }));
    });
    await waitFor(() => expect(el.accessToken).toBe('fresh-token'));
    spy.mockRestore();
  });

  it('si el manifiesto falla muestra el fallback con reintento', async () => {
    stubManifest(false);
    render(<MfeHost name="moderation" />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
