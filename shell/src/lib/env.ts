// Variables públicas de build. Next solo incrusta accesos literales a process.env.NEXT_PUBLIC_*.
const trim = (value: string) => value.replace(/\/+$/, '');

const apiUrl = trim(process.env.NEXT_PUBLIC_API_URL ?? 'http://api.bandada.localhost');
const graphqlUrl = trim(process.env.NEXT_PUBLIC_GRAPHQL_URL ?? `${apiUrl}/graphql`);

export const env = {
  apiUrl,
  graphqlUrl,
  graphqlWsUrl: trim(process.env.NEXT_PUBLIC_GRAPHQL_WS_URL ?? graphqlUrl.replace(/^http/, 'ws')),
  appUrl: trim(process.env.NEXT_PUBLIC_APP_URL ?? 'http://app.bandada.localhost'),
  mfeManifestUrl: process.env.NEXT_PUBLIC_MFE_MANIFEST_URL ?? '/mfe-manifest.json',
  defaultLocale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE === 'en' ? 'en' : 'es',
  featureInsights: process.env.NEXT_PUBLIC_FEATURE_INSIGHTS === 'true',
} as const;
