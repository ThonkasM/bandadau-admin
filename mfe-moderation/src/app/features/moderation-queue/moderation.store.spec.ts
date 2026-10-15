import { TestBed } from '@angular/core/testing';

import { HostConfig } from '../../core/host-config';
import { provideI18n } from '../../core/i18n';
import { RealtimeClient } from '../../core/realtime';
import { ShellBridge } from '../../core/shell-bridge';
import { FakeModerationService, fakeRealtime, mediaItem } from '../../../testing/fixtures';
import { ModerationService } from './moderation.service';
import { ModerationStore } from './moderation.store';

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('ModerationStore', () => {
  let fake: FakeModerationService;
  let store: ModerationStore;
  let host: HTMLElement;
  let toasts: Array<{ kind: string; messageKey: string; message: string }>;

  beforeEach(async () => {
    fake = new FakeModerationService();
    TestBed.configureTestingModule({
      providers: [
        provideI18n(),
        { provide: ModerationService, useValue: fake },
        { provide: RealtimeClient, useValue: fakeRealtime() },
      ],
    });
    const config = TestBed.inject(HostConfig);
    config.graphqlUrl.set('http://gw.test/graphql');
    config.setAccessToken('tok');
    host = document.createElement('div');
    toasts = [];
    host.addEventListener('bandada:toast', (e) => toasts.push((e as CustomEvent).detail));
    TestBed.inject(ShellBridge).attach(host);
    store = TestBed.inject(ModerationStore);
    store.start();
    await flush();
  });

  afterEach(() => store.stop());

  it('loads the queue, joins reports and selects the first entry', () => {
    expect(store.status()).toBe('ready');
    expect(store.entries().map((e) => e.key)).toEqual(['m-1', 'm-2', 'p-1']);
    expect(store.selectedKey()).toBe('m-1');
    expect(store.totalCount()).toBe(3);
    expect(fake.watching()).toBe(1);
  });

  it('approves a media: calls moderateMedia, toasts, removes it and selects the neighbour', async () => {
    const ok = await store.perform({ kind: 'APPROVE', entry: store.selected()! }, { note: 'ok', alsoSuspend: false });
    expect(ok).toBe(true);
    expect(fake.moderateMedia).toHaveBeenCalledWith('m-1', 'APPROVE', 'ok');
    expect(store.entries().map((e) => e.key)).toEqual(['m-2', 'p-1']);
    expect(store.selectedKey()).toBe('m-2');
    expect(toasts.at(-1)).toMatchObject({ kind: 'success', messageKey: 'moderation.toast.APPROVE', message: 'Contenido aprobado' });
  });

  it('resolves every open report of a post (KEEP/REMOVE) in order', async () => {
    store.select('p-1');
    await store.perform({ kind: 'REMOVE', entry: store.selected()! }, { note: '', alsoSuspend: false });
    expect(fake.resolveReport.mock.calls.map((c: unknown[]) => [c[0], c[1]])).toEqual([['r-1', 'REMOVE'], ['r-2', 'REMOVE']]);
    expect(store.entries().some((e) => e.key === 'p-1')).toBe(false);
  });

  it('on ALREADY_MODERATED shows the conflict message, drops the item and refreshes the queue', async () => {
    fake.moderateResult = { ok: false, code: 'ALREADY_MODERATED' };
    fake.items = [mediaItem('m-2')];
    const loads = fake.loadQueue.mock.calls.length;
    const ok = await store.perform({ kind: 'REJECT', entry: store.selected()! }, { note: '', alsoSuspend: false });
    await flush();
    expect(ok).toBe(false);
    expect(toasts.at(-1)).toMatchObject({ kind: 'info', messageKey: 'moderation.errors.ALREADY_MODERATED' });
    expect(fake.loadQueue.mock.calls.length).toBe(loads + 1);
    expect(store.entries().map((e) => e.key)).toEqual(['m-2']);
  });

  it('keeps the item and reports a translated error on other failures', async () => {
    fake.moderateResult = { ok: false, code: 'FORBIDDEN' };
    await store.perform({ kind: 'APPROVE', entry: store.selected()! }, { note: '', alsoSuspend: false });
    expect(toasts.at(-1)).toMatchObject({ kind: 'error', messageKey: 'errors.FORBIDDEN' });
    expect(store.entries().map((e) => e.key)).toContain('m-1');
  });

  it('rejects and suspends the author when requested', async () => {
    await store.perform({ kind: 'REJECT', entry: store.selected()! }, { note: 'grave', alsoSuspend: true });
    expect(fake.suspendUser).toHaveBeenCalledWith('u-1', 'grave');
    expect(store.suspendedUsers().has('u-1')).toBe(true);
  });

  it('offers suspendUser only to MODERATOR/ADMIN and never on the own or an already suspended account', async () => {
    expect(store.canSuspendAuthor(store.selected())).toBe(true);
    store.meId.set('u-1');
    expect(store.canSuspendAuthor(store.selected())).toBe(false);
    store.meId.set('me-1');
    store.roles.set(['STUDENT']);
    expect(store.canSuspendAuthor(store.selected())).toBe(false);
    store.roles.set(['ADMIN']);
    await store.perform({ kind: 'SUSPEND', entry: store.selected()! }, { note: 'spam', alsoSuspend: false });
    expect(store.canSuspendAuthor(store.selected())).toBe(false);
  });

  it('live: ADDED inserts on top flagged as new; RESOLVED removes the item and updates the total', async () => {
    fake.emitChange({ type: 'ADDED', totalCount: 4, item: mediaItem('m-9') });
    expect(store.entries()[0]).toMatchObject({ key: 'm-9', isNew: true });
    expect(store.totalCount()).toBe(4);

    fake.emitChange({ type: 'RESOLVED', totalCount: 3, item: mediaItem('m-2') });
    expect(store.entries().map((e) => e.key)).not.toContain('m-2');
    expect(store.totalCount()).toBe(3);
  });

  it('live: refreshes the queue after the socket reconnects (at-most-once delivery)', async () => {
    const loads = fake.loadQueue.mock.calls.length;
    fake.emitReconnect();
    await flush();
    expect(fake.loadQueue.mock.calls.length).toBe(loads + 1);
  });

  it('applies the type filter on the server (MEDIA -> source AI) and reloads', async () => {
    store.setFilters({ type: 'MEDIA' });
    await flush();
    expect(fake.calls.filter((c) => c.op === 'loadQueue').at(-1)!.args[0]).toEqual({ source: 'AI' });
  });

  it('shows the error state with the code when the load fails, and recovers on retry', async () => {
    fake.failLoad = 'NETWORK_ERROR';
    await store.reload();
    expect(store.status()).toBe('error');
    expect(store.errorCode()).toBe('NETWORK_ERROR');
    expect(store.errorMessage('NETWORK_ERROR')).toContain('Sin conexión');
    fake.failLoad = null;
    await store.reload();
    expect(store.status()).toBe('ready');
  });

  it('empty queue yields no selection', async () => {
    fake.items = [];
    fake.reports = [];
    await store.reload();
    expect(store.entries()).toEqual([]);
    expect(store.selectedKey()).toBeNull();
  });
});
