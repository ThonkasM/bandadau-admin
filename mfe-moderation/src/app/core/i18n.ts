import { Injectable, inject, provideAppInitializer } from '@angular/core';
import { Translation, TranslocoLoader, TranslocoService, provideTransloco } from '@jsverse/transloco';
import { Observable, of } from 'rxjs';
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat';
import enCommon from '@bandada/i18n/locales/en/common.json';
import enEnums from '@bandada/i18n/locales/en/enums.json';
import enErrors from '@bandada/i18n/locales/en/errors.json';
import esCommon from '@bandada/i18n/locales/es/common.json';
import esEnums from '@bandada/i18n/locales/es/enums.json';
import esErrors from '@bandada/i18n/locales/es/errors.json';

import enModeration from '../../assets/i18n/en/moderation.json';
import esModeration from '../../assets/i18n/es/moderation.json';

/**
 * Catálogos empaquetados en el bundle (un solo `main.js`): los comunes de `@bandada/i18n`
 * (`common`, `enums`, `errors`) más los propios del MFE (`moderation`). Las claves quedan
 * `<namespace>.<sección>.<clave>`, p. ej. `moderation.queue.title`, `errors.FORBIDDEN`.
 */
export const CATALOGS: Record<'es' | 'en', Translation> = {
  es: { common: esCommon, enums: esEnums, errors: esErrors, moderation: esModeration },
  en: { common: enCommon, enums: enEnums, errors: enErrors, moderation: enModeration },
};

@Injectable({ providedIn: 'root' })
export class BundledLoader implements TranslocoLoader {
  getTranslation(lang: string): Observable<Translation> {
    return of(CATALOGS[lang === 'en' ? 'en' : 'es']);
  }
}

export function provideI18n() {
  return [
    provideTransloco({
      config: {
        availableLangs: ['es', 'en'],
        defaultLang: 'es',
        fallbackLang: 'es',
        reRenderOnLangChange: true,
        prodMode: true,
        missingHandler: { logMissingKey: false },
      },
      loader: BundledLoader,
    }),
    provideTranslocoMessageformat(),
    // Catálogos estáticos: se registran de forma síncrona para que el primer render ya traduzca.
    provideAppInitializer(() => {
      const i18n = inject(TranslocoService);
      i18n.setTranslation(CATALOGS.es, 'es');
      i18n.setTranslation(CATALOGS.en, 'en');
    }),
  ];
}
