import { ErrorHandler, provideZonelessChangeDetection } from '@angular/core';
import { createCustomElement } from '@angular/elements';
import { createApplication } from '@angular/platform-browser';

import { provideI18n } from './app/core/i18n';
import { ModerationRootComponent } from './element/moderation-root.component';

export const ELEMENT_NAME = 'bandada-mfe-moderation';

class MfeErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    console.error('event=mfe.runtime.error mfe=moderation', error);
  }
}

async function register(): Promise<void> {
  // `customElements.define` solo puede llamarse una vez por nombre (carga repetida del script).
  if (customElements.get(ELEMENT_NAME)) return;

  const app = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideI18n(),
      { provide: ErrorHandler, useClass: MfeErrorHandler },
    ],
  });
  const NgElement = createCustomElement(ModerationRootComponent, { injector: app.injector });

  // `access-token` es solo propiedad: no se observa como atributo (quedaría visible en el DOM).
  const observed = NgElement.observedAttributes.filter((name) => name !== 'access-token');
  Object.defineProperty(NgElement, 'observedAttributes', { get: () => observed });

  if (!customElements.get(ELEMENT_NAME)) customElements.define(ELEMENT_NAME, NgElement);
}

void register();
