import { env } from '@/lib/env';

import { type MfeEntry, MfeError, type MfeManifest } from './types';

const ELEMENT_PATTERN = /^bandada-mfe-[a-z0-9-]+$/;

function isEntry(value: unknown): value is MfeEntry {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.url === 'string' && typeof v.element === 'string' && ELEMENT_PATTERN.test(v.element) && typeof v.version === 'string';
}

let manifestPromise: Promise<MfeManifest> | null = null;

/** Descarga `mfe-manifest.json` con `no-store` (D5): el despliegue de un MFE solo cambia este archivo. */
export function getManifest(options: { force?: boolean } = {}): Promise<MfeManifest> {
  if (!manifestPromise || options.force) {
    manifestPromise = (async () => {
      let res: Response;
      try {
        res = await fetch(env.mfeManifestUrl, { cache: 'no-store' });
      } catch {
        throw new MfeError('MANIFEST_FAILED');
      }
      if (!res.ok) throw new MfeError('MANIFEST_FAILED');
      const json: unknown = await res.json().catch(() => null);
      if (!json || typeof json !== 'object') throw new MfeError('MANIFEST_FAILED');
      const manifest: MfeManifest = {};
      for (const [name, entry] of Object.entries(json)) if (isEntry(entry)) manifest[name] = entry;
      return manifest;
    })();
    manifestPromise.catch(() => {
      manifestPromise = null;
    });
  }
  return manifestPromise;
}

export async function getEntry(name: string, options: { force?: boolean } = {}): Promise<MfeEntry> {
  const entry = (await getManifest(options))[name];
  if (!entry) throw new MfeError('MFE_NOT_IN_MANIFEST');
  return entry;
}

const loaded = new Map<string, Promise<void>>();

/**
 * Inyecta `<script type="module">` una sola vez por elemento (`customElements.define` no admite doble registro).
 * Con `integrity` usa SRI + `crossorigin="anonymous"`.
 */
export function loadScript(entry: MfeEntry): Promise<void> {
  const existing = loaded.get(entry.element);
  if (existing) return existing;
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = entry.url;
    script.dataset.mfe = entry.element;
    if (entry.integrity) {
      script.integrity = entry.integrity;
      script.crossOrigin = 'anonymous';
    }
    script.onload = () => resolve();
    script.onerror = () => {
      loaded.delete(entry.element);
      script.remove();
      reject(new MfeError('MFE_LOAD_FAILED'));
    };
    document.head.appendChild(script);
  });
  loaded.set(entry.element, promise);
  return promise;
}

/** Reintento del fallback: olvida el script fallido y vuelve a pedir el manifiesto. */
export function resetMfeCache(entry?: MfeEntry) {
  if (entry) {
    loaded.delete(entry.element);
    document.head.querySelectorAll(`script[data-mfe="${entry.element}"]`).forEach((node) => node.remove());
  }
  manifestPromise = null;
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new MfeError('MFE_TIMEOUT')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
