// Sirve el build (dist/mfe-insights) en :4301 con CORS abierto (para probarlo dentro del shell).
import { startServer } from './serve.mjs';

startServer(Number(process.env.PORT ?? 4301));
