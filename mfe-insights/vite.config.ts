import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Library mode: un único módulo ES `dist/mfe-insights/main.js` (+ chunk diferido de vega-embed).
export default defineConfig({
  plugins: [react()],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: 'dist/mfe-insights',
    emptyOutDir: true,
    sourcemap: false,
    cssCodeSplit: false,
    lib: { entry: 'src/element.tsx', formats: ['es'], fileName: () => 'main.js' },
    rolldownOptions: { output: { codeSplitting: true } },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/testing/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
