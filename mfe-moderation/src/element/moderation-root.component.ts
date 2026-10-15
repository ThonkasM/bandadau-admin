import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewEncapsulation,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

import { HostConfig, LocaleName, ThemeName } from '../app/core/host-config';
import { ShellBridge } from '../app/core/shell-bridge';
import { ModerationPageComponent } from '../app/features/moderation-queue/moderation-page.component';
import { ModerationStore } from '../app/features/moderation-queue/moderation.store';

/**
 * Raíz del Web Component `<bandada-mfe-moderation>`. Único componente con `ShadowDom`: los hijos
 * usan `None` sin estilos propios y heredan la hoja `moderation.css` dentro del mismo shadow root.
 *
 * Entradas (microfrontends.md §3): `graphql-url`, `access-token` (solo propiedad), `base-path`,
 * `theme`, `locale`. El atributo `data-theme` del anfitrión activa el modo en las variables
 * `--bd-*` del `tokens.css` que carga el shell (las variables heredan a través del Shadow DOM).
 */
@Component({
  selector: 'bmod-root',
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModerationPageComponent],
  styleUrl: './moderation.css',
  host: {
    '[attr.data-theme]': 'theme()',
    '[attr.lang]': 'locale()',
  },
  template: `<bmod-page />`,
})
export class ModerationRootComponent implements OnDestroy {
  readonly graphqlUrl = input('');
  readonly accessToken = input<string | null>(null);
  readonly basePath = input('/moderation');
  readonly theme = input<ThemeName>('light');
  readonly locale = input<LocaleName>('es');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly config = inject(HostConfig);
  private readonly bridge = inject(ShellBridge);
  private readonly store = inject(ModerationStore);
  private readonly i18n = inject(TranslocoService);

  constructor() {
    this.bridge.attach(this.host.nativeElement);

    effect(() => {
      this.config.graphqlUrl.set(this.graphqlUrl());
      this.config.basePath.set(this.basePath());
      this.config.theme.set(this.theme() === 'dark' ? 'dark' : 'light');
      const locale: LocaleName = this.locale() === 'en' ? 'en' : 'es';
      this.config.locale.set(locale);
      this.i18n.setActiveLang(locale);
      this.config.setAccessToken(this.accessToken() || null);
    });

    // (Re)inicia la carga cuando hay URL y token; un token nuevo reinicia también el WebSocket.
    effect(() => {
      const url = this.config.graphqlUrl();
      const token = this.config.accessToken();
      untracked(() => {
        if (!url) {
          console.error('event=mfe.contract.violation missing=graphql-url mfe=moderation');
          this.store.contractViolation();
        } else if (token) {
          this.store.start();
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.store.stop();
    this.bridge.attach(null);
  }
}
