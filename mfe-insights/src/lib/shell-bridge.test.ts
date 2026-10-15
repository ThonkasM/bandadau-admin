import { describe, expect, it } from 'vitest';

import { ShellBridge } from './shell-bridge';

function setup() {
  const bridge = new ShellBridge((key, params) => `T(${key}${params ? JSON.stringify(params) : ''})`);
  const host = document.createElement('div');
  const shadowChild = host.attachShadow({ mode: 'open' }).appendChild(document.createElement('span'));
  const received: CustomEvent[] = [];
  for (const type of ['bandada:navigate', 'bandada:toast', 'bandada:auth-expired']) {
    document.addEventListener(type, (e) => received.push(e as CustomEvent));
  }
  document.body.append(host);
  bridge.attach(host);
  return { bridge, host, shadowChild, received };
}

describe('ShellBridge', () => {
  it('emits bandada:navigate with bubbles+composed so it crosses the shadow root', () => {
    const { bridge, received } = setup();
    bridge.navigate('/runs', true);
    const event = received.at(-1) as CustomEvent;
    expect(event.type).toBe('bandada:navigate');
    expect(event.detail).toEqual({ path: '/runs', replace: true });
    expect(event.bubbles && event.composed).toBe(true);
  });

  it('emits bandada:toast with the key and the message already translated', () => {
    const { bridge, received } = setup();
    const message = bridge.toast('success', 'insights:alerts.acknowledged');
    expect(message).toBe('T(insights:alerts.acknowledged)');
    expect((received.at(-1) as CustomEvent).detail).toEqual({ kind: 'success', messageKey: 'insights:alerts.acknowledged', message });
  });

  it('emits bandada:auth-expired and does nothing when detached', () => {
    const { bridge, received } = setup();
    bridge.authExpired();
    expect((received.at(-1) as CustomEvent).type).toBe('bandada:auth-expired');
    const count = received.length;
    bridge.attach(null);
    bridge.authExpired();
    expect(received).toHaveLength(count);
  });
});
