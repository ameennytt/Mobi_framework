'use strict';

/**
 * Dev-only static server for the REFERENCE app (cricswing-production/web), used purely
 * for the pixel-match pass — render the real CricSwing screens beside the framework's
 * and measure computed styles. Not shipped; not part of the framework runtime.
 *
 *   node scripts/serve-cricswing.js [port]
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = 'C:/Users/alame/Desktop/cricswing-production/web';
const PORT = parseInt(process.argv[2] || '4100', 10);
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
  let url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url === '/' || url === '/bat') url = '/lobby.html';
  if (url === '/play') url = '/bat.html';
  if (url === '/screen') url = '/screen.html';
  const file = path.normalize(path.join(ROOT, url));
  if (!file.startsWith(path.normalize(ROOT))) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); res.end('not found: ' + url); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}).listen(PORT, () => console.log(`cricswing reference on http://localhost:${PORT}`));
