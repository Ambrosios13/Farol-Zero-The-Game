// Farol Zero – local dev server (LAN only, never opens to the internet)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://x').pathname === '/' ? '/index.html' : new URL(req.url, 'http://x').pathname;
  const filePath = normalize(join(root, path));
  if (!filePath.startsWith(root)) { res.writeHead(403); return res.end(); }
  try {
    const buf = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(buf);
  } catch {
    res.writeHead(404); res.end('not found');
  }
});

server.listen(PORT, () => {
  console.log(`Farol Zero → http://localhost:${PORT}`);
  console.log(`Cell phone on the same Wi‑Fi: http://<your-pc-ip>:${PORT}`);
});
