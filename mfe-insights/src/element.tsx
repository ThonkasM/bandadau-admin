import { createRoot, type Root } from 'react-dom/client';

import { App } from './app/App';
import { createServices, type Services, ServicesProvider } from './app/services';
import { HostConfig, normalizeLocale, normalizeTheme } from './lib/host-config';
import { createI18n } from './lib/i18n';
import { ShellBridge } from './lib/shell-bridge';
import styles from './styles.css?inline';

export const ELEMENT_NAME = 'bandada-mfe-insights';

/**
 * Web Component `<bandada-mfe-insights>` (microfrontends.md §3): Shadow DOM abierto, hoja de estilos propia
 * (solo `var(--bd-*)`) y React 19. Entradas: atributos `graphql-url`, `base-path`, `theme`, `locale` y la
 * propiedad `accessToken` (nunca atributo). Salidas: `bandada:navigate | toast | auth-expired`.
 */
export class BandadaMfeInsights extends HTMLElement {
  static readonly observedAttributes = ['graphql-url', 'base-path', 'theme', 'locale'];

  /** Inyectable en pruebas. */
  static servicesFactory: ((config: HostConfig, bridge: ShellBridge, i18n: ReturnType<typeof createI18n>) => Services) | null = null;

  private readonly config = new HostConfig();
  private readonly i18n = createI18n();
  private readonly bridge = new ShellBridge((key, params) => this.i18n.t(key, params));
  private services: Services | null = null;
  private root: Root | null = null;
  private mount: HTMLElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  // --- propiedades del contrato -------------------------------------------------
  get graphqlUrl(): string {
    return this.config.graphqlUrl;
  }
  set graphqlUrl(value: string) {
    this.config.update({ graphqlUrl: value ?? '' });
  }
  /** Solo propiedad: nunca se refleja en el DOM ni se persiste. */
  get accessToken(): string | null {
    return this.config.accessToken;
  }
  set accessToken(value: string | null) {
    this.config.update({ accessToken: value || null });
  }
  get basePath(): string {
    return this.config.getSnapshot().basePath;
  }
  set basePath(value: string) {
    this.config.update({ basePath: value || '/insights' });
  }
  get theme(): 'light' | 'dark' {
    return this.config.theme;
  }
  set theme(value: string) {
    this.applyTheme(normalizeTheme(value));
  }
  get locale(): 'es' | 'en' {
    return this.config.locale;
  }
  set locale(value: string) {
    this.applyLocale(normalizeLocale(value));
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    switch (name) {
      case 'graphql-url':
        this.graphqlUrl = value ?? '';
        break;
      case 'base-path':
        this.basePath = value ?? '';
        break;
      case 'theme':
        this.applyTheme(normalizeTheme(value));
        break;
      case 'locale':
        this.applyLocale(normalizeLocale(value));
        break;
    }
  }

  connectedCallback(): void {
    if (this.root) return;
    const shadow = this.shadowRoot as ShadowRoot;
    const style = document.createElement('style');
    style.textContent = styles;
    this.mount = document.createElement('div');
    this.mount.className = 'bi-root';
    shadow.replaceChildren(style, this.mount);

    // atributos presentes antes de definir el elemento (el shell los asigna al crearlo)
    for (const attr of BandadaMfeInsights.observedAttributes) {
      if (this.hasAttribute(attr)) this.attributeChangedCallback(attr, null, this.getAttribute(attr));
    }
    this.applyTheme(this.config.theme);
    this.applyLocale(this.config.locale);
    if (!this.graphqlUrl) {
      console.error('event=mfe.contract.violation missing=graphql-url mfe=insights');
    }

    this.bridge.attach(this);
    this.services = BandadaMfeInsights.servicesFactory?.(this.config, this.bridge, this.i18n) ?? createServices(this.config, this.bridge, this.i18n);
    this.root = createRoot(this.mount);
    this.root.render(
      <ServicesProvider services={this.services}>
        <App />
      </ServicesProvider>,
    );
  }

  disconnectedCallback(): void {
    // el shell puede mover el nodo; se desmonta en el siguiente microtask si ya no está conectado
    queueMicrotask(() => {
      if (this.isConnected) return;
      this.root?.unmount();
      this.root = null;
      this.services?.realtime.reset();
      this.bridge.attach(null);
    });
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    this.config.update({ theme });
    // El anfitrión es el elemento con `data-theme`: las variables `--bd-*` heredan al shadow root.
    if (this.getAttribute('data-theme') !== theme) this.setAttribute('data-theme', theme);
  }

  private applyLocale(locale: 'es' | 'en'): void {
    this.config.update({ locale });
    void this.i18n.changeLanguage(locale);
    if (this.getAttribute('lang') !== locale) this.setAttribute('lang', locale);
  }
}

if (!customElements.get(ELEMENT_NAME)) customElements.define(ELEMENT_NAME, BandadaMfeInsights);
