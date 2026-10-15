import react from '@bandada/eslint-config/react';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'dev/**', 'scripts/**', 'coverage/**'] },
  ...react,
  {
    files: ['**/*.{ts,tsx}'],
    rules: { 'no-console': ['warn', { allow: ['error'] }] },
  },
];
