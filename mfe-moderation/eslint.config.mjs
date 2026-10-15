import base from '@bandada/eslint-config/angular';
import angular from 'angular-eslint';

export default [
  { ignores: ['dist/**', '.angular/**', 'node_modules/**', 'src/dev/dev-host.js', 'dev/**', 'scripts/**'] },
  ...base,
  ...angular.configs.tsRecommended.map((c) => ({ ...c, files: ['**/*.ts'] })),
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'bmod', style: 'kebab-case' }],
      '@angular-eslint/directive-selector': 'off',
      '@angular-eslint/prefer-inject': 'off',
      'no-console': ['warn', { allow: ['error'] }],
    },
  },
];
