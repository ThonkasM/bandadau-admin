import next from '@bandada/eslint-config/next';

export default [
  ...next,
  { ignores: ['out/**', '.next/**', 'dev-mock/**', 'scripts/**', 'public/**'] },
  {
    files: ['**/*.{ts,tsx}'],
    rules: { '@next/next/no-html-link-for-pages': 'off' },
  },
];
