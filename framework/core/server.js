'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const wsLayer = require('./websocket');
const roomManager = require('./room-manager');

const PORT = 3000;

// ── Local Pairing Store (Emulates Cloudflare Worker DO pairing locally) ─────
const pairingSessions = new Map();

function getLanIPv4() {
  const ifaces = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(ifaces)) {
    for (const info of ifaces[name] || []) {
      if (info && info.family === 'IPv4' && !info.internal) {
        const addr = info.address;
        // Check private ranges
        if (addr.startsWith('10.') || addr.startsWith('192.168.') || addr.startsWith('169.254.')) {
          candidates.push(addr);
        } else {
          const m = addr.match(/^172\.(\d+)\./);
          if (m) {
            const o = +m[1];
            if (o >= 16 && o <= 31) candidates.push(addr);
          }
        }
      }
    }
  }
  return candidates[0] || '127.0.0.1';
}

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.webp': 'image/webp',
  '.ttf':  'font/ttf',
  '.woff2': 'font/woff2',
};

// Periodic room culler (runs every 60s)
setInterval(() => {
  roomManager.sweep();
}, 60000);

function requestHandler(req, res) {
  const urlPath = req.url.split('?')[0];
  const url = new URL(req.url, 'http://localhost');

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  // ── Local IP Discovery API ────────────────────────────────────────────────
  if (urlPath === '/api/local-ip') {
    const ip = getLanIPv4();
    res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, headers));
    res.end(JSON.stringify({ ip }));
    return;
  }

  // ── Local Pairing API (Cloudflare Worker Local Emulator) ──────────────────
  if (urlPath === '/api/new') {
    // Generate 4-character code
    const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
    
    pairingSessions.set(code, { status: 'waiting', expires: Date.now() + 5 * 60 * 1000 });
    res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, headers));
    res.end(JSON.stringify({ code }));
    return;
  }

  if (urlPath === '/api/pair' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        const j = JSON.parse(body);
        const code = String(j.code || '').toUpperCase().trim();
        const lanUrl = String(j.lanUrl || '').trim();

        if (pairingSessions.has(code)) {
          pairingSessions.set(code, { status: 'paired', url: lanUrl, expires: Date.now() + 60000 });
          res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, headers));
          res.end(JSON.stringify({ ok: true }));
        } else {
          res.writeHead(404, Object.assign({ 'Content-Type': 'application/json' }, headers));
          res.end(JSON.stringify({ error: 'expired' }));
        }
      } catch (_) {
        res.writeHead(400, Object.assign({ 'Content-Type': 'application/json' }, headers));
        res.end(JSON.stringify({ error: 'bad_payload' }));
      }
    });
    return;
  }

  if (urlPath === '/api/poll') {
    const code = String(url.searchParams.get('code') || '').toUpperCase().trim();
    const session = pairingSessions.get(code);

    res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, headers));
    if (!session || Date.now() > session.expires) {
      res.end(JSON.stringify({ status: 'expired' }));
    } else {
      res.end(JSON.stringify(session));
    }
    return;
  }

  // ── Static File Router ────────────────────────────────────────────────────
  let localFile = null;

  // Pattern A: Game Extensions (/games/:gameId/assets/... or /games/:gameId/controller.html)
  if (urlPath.startsWith('/games/')) {
    const parts = urlPath.slice(7).split('/');
    const gameId = parts[0];
    const rest = parts.slice(1).join('/');
    localFile = path.join(__dirname, '..', '..', 'games', gameId, rest);
  }
  // Pattern B: Framework Services (/framework/ui/framework.css, /framework/renderer/tv-perf-manager.js)
  else if (urlPath.startsWith('/framework/')) {
    const parts = urlPath.slice(11).split('/');
    const service = parts[0];
    const rest = parts.slice(1).join('/');
    localFile = path.join(__dirname, '..', '..', 'framework', service, rest);
  }

  if (!localFile || !fs.existsSync(localFile) || fs.statSync(localFile).isDirectory()) {
    res.writeHead(404);
    res.end('File not found: ' + urlPath);
    return;
  }

  // Read and pipe static file
  fs.readFile(localFile, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Error loading file');
      return;
    }
    const ext = path.extname(localFile);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'text/plain',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
}

const server = http.createServer(requestHandler);

wsLayer.init(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Framework Server] Running locally on http://localhost:${PORT}`);
  console.log(`[Framework Server] Smart TV endpoint: http://localhost:${PORT}/games/<game-id>/screen.html`);
  console.log(`[Framework Server] Mobile pairing endpoint: http://localhost:${PORT}/games/<game-id>/lobby.html`);
});
