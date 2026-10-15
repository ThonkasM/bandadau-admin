// Servidor estático con CORS abierto: sirve dist/mfe-insights (main.js, chunks) y el host de prueba standalone.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist', 'mfe-insights');
const devDir = path.join(root, 'dev');
const tokens = path.join(root, 'node_modules/@bandada/ui-tokens/dist/css/tokens.css');
const types = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html; charset=utf-8', '.map': 'application/json' };

export function startServer(port) {
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file;
    if (pathname === '/' || pathname === '/index.html') file = path.join(devDir, 'index.html');
    else if (pathname === '/tokens.css') file = tokens;
    else if (pathname.startsWith('/dev/')) file = path.join(devDir, pathname.slice(5));
    else file = path.join(dist, pathname);
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.statusCode = 404;
      return res.end('not found');
    }
    res.setHeader('Content-Type', types[path.extname(file)] ?? 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    fs.createReadStream(file).pipe(res);
  });
  server.listen(port, () => console.log(`mfe-insights: http://localhost:${port}/ (main.js en /main.js)`));
  return server;
}
