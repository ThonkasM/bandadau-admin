// Simula al shell: asigna atributos/propiedades y escucha los eventos bandada:* del MFE.
// Parámetros opcionales: ?gql=http://localhost:4011/graphql&token=...&theme=dark&locale=en
const params = new URLSearchParams(location.search);
const mfe = document.getElementById('mfe');
const log = document.getElementById('log');
let GOOD_TOKEN = params.get('token') ?? 'dev-admin-token';
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
urlInput.value = params.get('gql') ?? 'http://localhost:4011/graphql';
function applyUrl() {
  mfe.graphqlUrl = urlInput.value;
}

// Contra el gateway mock oficial (bandadau-infra/mock) el token sale de su login REST de desarrollo
// (usuario demo del seed local); contra el mock propio de esta carpeta sirve 'dev-admin-token'.
async function fetchDevToken() {
  if (params.has('token')) return GOOD_TOKEN;
  try {
    const origin = new URL(urlInput.value).origin;
    const res = await fetch(`${origin}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@umsa.edu.bo', password: 'Bandada#2026' }),
    });
    if (res.ok) GOOD_TOKEN = (await res.json()).accessToken ?? GOOD_TOKEN;
  } catch {
    /* mock propio: se usa el token fijo */
  }
  return GOOD_TOKEN;
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
  setTimeout(async () => {
    mfe.accessToken = await fetchDevToken();
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
document.getElementById('btn-token-ok').addEventListener('click', async () => (mfe.accessToken = await fetchDevToken()));
document.getElementById('btn-token-bad').addEventListener('click', () => (mfe.accessToken = BAD_TOKEN));
document.getElementById('btn-token-none').addEventListener('click', () => (mfe.accessToken = null));
document.getElementById('btn-url').addEventListener('click', applyUrl);

applyTheme();
applyLocale();
applyUrl();
// El token es PROPIEDAD, nunca atributo.
customElements.whenDefined('bandada-mfe-insights').then(async () => {
  mfe.accessToken = await fetchDevToken();
  write('shell: elemento definido, accessToken asignado como propiedad');
});
