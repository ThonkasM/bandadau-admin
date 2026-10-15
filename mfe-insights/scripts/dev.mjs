// Desarrollo: `vite build --watch` (library mode) + servidor estático con CORS en http://localhost:4301.
import { build } from 'vite';

import { startServer } from './serve.mjs';

startServer(Number(process.env.PORT ?? 4301));
await build({ mode: 'development', build: { watch: {}, minify: false } });
