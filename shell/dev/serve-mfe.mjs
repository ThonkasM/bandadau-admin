// Servidor estático con CORS para probar el shell con el build del MFE:
//   node dev/serve-mfe.mjs [dir] [puerto]   (por defecto ../mfe-moderation/dist/mfe-moderation en :4201)
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const dir = path.resolve(process.argv[2] ?? '../mfe-moderation/dist/mfe-moderation');
const port = Number(process.argv[3] ?? 4201);
const types = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.map': 'application/json' };

http
  .createServer((req, res) => {
    const file = path.join(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.statusCode = 404;
      return res.end('not found');
    }
    res.setHeader('Content-Type', types[path.extname(file)] ?? 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`serving ${dir} on http://localhost:${port}`));
