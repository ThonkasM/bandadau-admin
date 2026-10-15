import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';

import { HostConfig } from '../app/core/host-config';
import { provideI18n } from '../app/core/i18n';
import { RealtimeClient } from '../app/core/realtime';
import { ModerationService } from '../app/features/moderation-queue/moderation.service';
import { FakeModerationService, fakeRealtime } from '../testing/fixtures';
import { ModerationRootComponent } from './moderation-root.component';

const flush = () => new Promise((r) => setTimeout(r, 0));

async function render(): Promise<{ fixture: ComponentFixture<ModerationRootComponent>; host: HTMLElement; shadow: ShadowRoot }> {
  const fixture = TestBed.createComponent(ModerationRootComponent);
  fixture.componentRef.setInput('graphqlUrl', 'http://gw.test/graphql');
  fixture.componentRef.setInput('accessToken', 'tok');
  fixture.detectChanges();
  await fixture.whenStable();
  await flush();
  fixture.detectChanges();
  await fixture.whenStable();
  const host = fixture.nativeElement as HTMLElement;
  return { fixture, host, shadow: host.shadowRoot! };
}

describe('<bandada-mfe-moderation> rendering', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideI18n(),
        { provide: ModerationService, useValue: new FakeModerationService() },
        { provide: RealtimeClient, useValue: fakeRealtime() },
      ],
    });
  });

  it('renders the queue inside a Shadow DOM root', async () => {
    const { shadow } = await render();
    expect(shadow).toBeTruthy();
    expect(shadow.querySelector('h1')?.textContent).toContain('Moderación');
    expect(shadow.querySelectorAll('[role="option"]')).toHaveLength(3);
    expect(shadow.querySelector('[role="listbox"]')).toBeTruthy();
    expect(shadow.querySelector('bmod-detail-panel .bmod-detail')).toBeTruthy();
  });

  it.each([
    ['light', 'es', 'Moderación', 'Aprobar'],
    ['dark', 'es', 'Moderación', 'Aprobar'],
    ['light', 'en', 'Moderation', 'Approve'],
    ['dark', 'en', 'Moderation', 'Approve'],
  ])('theme=%s locale=%s', async (theme: string, locale: string, title: string, approve: string) => {
    const { fixture, host, shadow } = await render();
    fixture.componentRef.setInput('theme', theme);
    fixture.componentRef.setInput('locale', locale);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // `data-theme` en el anfitrión activa el bloque correspondiente de tokens.css (variables --bd-*).
    expect(host.getAttribute('data-theme')).toBe(theme);
    expect(host.getAttribute('lang')).toBe(locale);
    expect(TestBed.inject(HostConfig).theme()).toBe(theme);
    expect(TestBed.inject(TranslocoService).getActiveLang()).toBe(locale);
    expect(shadow.querySelector('h1')?.textContent).toContain(title);
    expect(shadow.querySelector('.bmod-actions .bmod-btn--primary')?.textContent).toContain(approve);
  });

  it('switches language live without re-creating the component', async () => {
    const { fixture, shadow } = await render();
    const h1 = shadow.querySelector('h1');
    fixture.componentRef.setInput('locale', 'en');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(shadow.querySelector('h1')).toBe(h1);
    expect(h1?.textContent).toContain('Moderation');
  });

  it('exposes the contract roles: listbox + aria-selected, dialog labelled, live region', async () => {
    const { shadow } = await render();
    const options = [...shadow.querySelectorAll('[role="option"]')];
    expect(options.filter((o) => o.getAttribute('aria-selected') === 'true')).toHaveLength(1);
    expect(shadow.querySelector('dialog')?.getAttribute('aria-labelledby')).toBe('bmod-dialog-title');
    expect(shadow.querySelector('.bmod-live')?.getAttribute('role')).toBe('status');
  });

  it('keyboard: j moves the selection, a opens the confirmation dialog', async () => {
    const { fixture, shadow } = await render();
    const root = shadow.querySelector('.bmod')!;
    const press = (key: string) => root.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true }));

    press('j');
    fixture.detectChanges();
    expect(shadow.querySelector('[aria-selected="true"]')?.id).toContain('m-2');

    press('a');
    fixture.detectChanges();
    await fixture.whenStable();
    const dialog = shadow.querySelector('dialog')!;
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(dialog.textContent).toContain('Aprobar este medio');
  });

  it('shows the empty state', async () => {
    TestBed.resetTestingModule();
    const fake = new FakeModerationService();
    fake.items = [];
    fake.reports = [];
    TestBed.configureTestingModule({
      providers: [provideI18n(), { provide: ModerationService, useValue: fake }, { provide: RealtimeClient, useValue: fakeRealtime() }],
    });
    const { shadow } = await render();
    expect(shadow.textContent).toContain('No hay contenido pendiente de revisión.');
  });

  it('shows the error state with a retry button', async () => {
    TestBed.resetTestingModule();
    const fake = new FakeModerationService();
    fake.failLoad = 'UPSTREAM_UNAVAILABLE';
    TestBed.configureTestingModule({
      providers: [provideI18n(), { provide: ModerationService, useValue: fake }, { provide: RealtimeClient, useValue: fakeRealtime() }],
    });
    const { shadow } = await render();
    expect(shadow.querySelector('[role="alert"]')?.textContent).toContain('No pudimos cargar la cola');
    expect(shadow.querySelector('[role="alert"] button')?.textContent).toContain('Reintentar');
  });
});

