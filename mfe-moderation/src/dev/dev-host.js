// Simula al shell: asigna atributos/propiedades y escucha los eventos bandada:* del MFE.
// Parámetros opcionales: ?gql=http://localhost:4010/graphql&token=...&theme=dark&locale=en
const params = new URLSearchParams(location.search);
const mfe = document.getElementById('mfe');
const log = document.getElementById('log');
const GOOD_TOKEN = params.get('token') ?? 'dev-moderator-token';
const BAD_TOKEN = 'expired-token';

const state = {
  theme: params.get('theme') === 'dark' ? 'dark' : 'light',
  locale: params.get('locale') === 'en' ? 'en' : 'es',
};

function write(line) {
  log.textContent = `${new Date().toLocaleTimeString()} ${line}\n${log.textContent}`.slice(0, 4000);
}

function applyTheme() {
  // El shell real resuelve el tema, fija data-theme en <html> y pasa el atributo al MFE.
  document.documentElement.setAttribute('data-theme', state.theme);
  mfe.setAttribute('theme', state.theme);
  mfe.dispatchEvent(new CustomEvent('bandada:theme-changed', { detail: { theme: state.theme } }));
  document.getElementById('btn-theme').textContent = `Tema: ${state.theme === 'dark' ? 'oscuro' : 'claro'}`;
}
function applyLocale() {
  document.documentElement.lang = state.locale;
  mfe.setAttribute('locale', state.locale);
  mfe.dispatchEvent(new CustomEvent('bandada:locale-changed', { detail: { locale: state.locale } }));
  document.getElementById('btn-locale').textContent = `Idioma: ${state.locale}`;
}

const urlInput = document.getElementById('gql-url');
urlInput.value = params.get('gql') ?? 'http://localhost:4010/graphql';
function applyUrl() {
  mfe.graphqlUrl = urlInput.value;
}

function showToast(detail) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = `[${detail.kind}] ${detail.message ?? detail.messageKey}`;
  document.getElementById('toasts').append(el);
  setTimeout(() => el.remove(), 4000);
}

mfe.addEventListener('bandada:toast', (e) => {
  write(`bandada:toast ${JSON.stringify(e.detail)}`);
  showToast(e.detail);
});
mfe.addEventListener('bandada:navigate', (e) => write(`bandada:navigate ${JSON.stringify(e.detail)}`));
mfe.addEventListener('bandada:auth-expired', () => {
  write('bandada:auth-expired -> el shell simula un refresh y reasigna accessToken en 600 ms');
  setTimeout(() => {
    mfe.accessToken = GOOD_TOKEN;
    write('shell: accessToken renovado');
  }, 600);
});

document.getElementById('btn-theme').addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
});
document.getElementById('btn-locale').addEventListener('click', () => {
  state.locale = state.locale === 'es' ? 'en' : 'es';
  applyLocale();
});
document.getElementById('btn-token-ok').addEventListener('click', () => (mfe.accessToken = GOOD_TOKEN));
document.getElementById('btn-token-bad').addEventListener('click', () => (mfe.accessToken = BAD_TOKEN));
document.getElementById('btn-token-none').addEventListener('click', () => (mfe.accessToken = null));
document.getElementById('btn-url').addEventListener('click', applyUrl);

applyTheme();
applyLocale();
applyUrl();
// El token es PROPIEDAD, nunca atributo.
customElements.whenDefined('bandada-mfe-moderation').then(() => {
  mfe.accessToken = GOOD_TOKEN;
  write('shell: elemento definido, accessToken asignado como propiedad');
});

// Automatización para capturas: ?keys=j,a  envía teclas al MFE (atajos) tras cargar la cola.
const keys = (params.get('keys') ?? '').split(',').filter(Boolean);
if (keys.length > 0) {
  setTimeout(async () => {
    const root = mfe.shadowRoot?.querySelector('.bmod');
    for (const key of keys) {
      root?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true }));
      await new Promise((r) => setTimeout(r, 250));
    }
  }, 2000);
}
