import type { Role } from '@bandada/contracts-ts/graphql/admin';

/** Entrada de `mfe-manifest.json` (contracts/mfe/mfe-manifest.schema.json). */
export interface MfeEntry {
  url: string;
  element: string;
  version: string;
  integrity?: string;
  requiredRoles?: Role[];
  basePath?: string;
}

export type MfeManifest = Record<string, MfeEntry>;

/** Contrato del elemento (microfrontends.md §3): el token entra SOLO como propiedad. */
export interface BandadaMfeElement extends HTMLElement {
  accessToken: string | null;
  graphqlUrl: string;
}

export type MfeErrorCode = 'MANIFEST_FAILED' | 'MFE_NOT_IN_MANIFEST' | 'MFE_LOAD_FAILED' | 'MFE_TIMEOUT';

export class MfeError extends Error {
  readonly code: MfeErrorCode;
  constructor(code: MfeErrorCode) {
    super(code);
    this.name = 'MfeError';
    this.code = code;
  }
}
