'use strict';
// Minimal HTTP/1.1 server logic for the on-device server. Serves the SAME routes
// the framework dev server (framework/core/server.js) serves: /framework/* and
// /games/<id>/* static files, plus /api/local-ip. Every response is
// `Connection: close` (one request per TCP connection) — simpler + robust; the
// WebView just opens more sockets. The WS upgrade path is detected here and handed
// back to index.js, which keeps that socket open. Static assets are read from the
// app's bundled android assets via react-native-fs (see index.js `readAsset`),
// always base64 → Buffer so binary (png/webp/ttf/woff2) and text are uniform.
//
// Asset layout on device (populated by scripts/sync-assets.js):
//   web/framework/<path>        ← the framework/ tree
//   web/games/<id>/<path>       ← the game's dir (html/js/config/assets)
const { Buffer } = require('buffer');

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};

function extOf(file) {
  const i = file.lastIndexOf('.');
  return i === -1 ? '' : file.slice(i).toLowerCase();
}

// Parse the request head from the accumulated buffer. Returns null if the
// terminating CRLFCRLF hasn't arrived yet (caller should wait for more data).
function parseHead(buf) {
  const text = buf.toString('latin1');
  const end = text.indexOf('\r\n\r\n');
  if (end === -1) return null;
  const headText = text.slice(0, end);
  const lines = headText.split('\r\n');
  const first = (lines[0] || '').split(' ');
  const headers = {};
  for (let i = 1; i < lines.length; i++) {
    const idx = lines[i].indexOf(':');
    if (idx > 0) headers[lines[i].slice(0, idx).trim().toLowerCase()] = lines[i].slice(idx + 1).trim();
  }
  return { method: first[0] || '', url: first[1] || '/', headers, headEnd: end + 4 };
}

function isWebSocketUpgrade(req) {
  const up = (req.headers['upgrade'] || '').toLowerCase();
  return up === 'websocket' && !!req.headers['sec-websocket-key'];
}

// RN has no reliable global URL/searchParams, so parse the target by hand.
// pathOf() strips the query; parseQuery() returns a {get(name)} matching the
// URLSearchParams surface the relay expects.
function pathOf(url) {
  const i = url.indexOf('?');
  return i >= 0 ? url.slice(0, i) : url;
}
function parseQuery(url) {
  const q = {};
  const i = url.indexOf('?');
  if (i >= 0) {
    for (const pair of url.slice(i + 1).split('&')) {
      if (!pair) continue;
      const e = pair.indexOf('=');
      const k = decodeURIComponent(e >= 0 ? pair.slice(0, e) : pair);
      const v = e >= 0 ? decodeURIComponent(pair.slice(e + 1).replace(/\+/g, ' ')) : '';
      q[k] = v;
    }
  }
  return { get: (k) => (Object.prototype.hasOwnProperty.call(q, k) ? q[k] : null) };
}

function buildResponse(status, headers, bodyBuf) {
  const statusText = status === 200 ? 'OK' : status === 204 ? 'No Content'
    : status === 403 ? 'Forbidden' : status === 404 ? 'Not Found'
    : status === 500 ? 'Internal Server Error' : 'OK';
  let head = 'HTTP/1.1 ' + status + ' ' + statusText + '\r\n';
  const h = Object.assign({ Connection: 'close' }, headers);
  if (bodyBuf) h['Content-Length'] = bodyBuf.length;
  for (const k of Object.keys(h)) head += k + ': ' + h[k] + '\r\n';
  head += '\r\n';
  return bodyBuf ? Buffer.concat([Buffer.from(head, 'latin1'), bodyBuf]) : Buffer.from(head, 'latin1');
}

// Map a request path to a bundled asset relative path (under web/), or null if
// the path is not a servable framework/game asset. Rejects `..` traversal.
function assetForPath(urlPath) {
  if (urlPath.indexOf('..') !== -1) return null;
  // /framework/<service>/<rest...> → framework/<service>/<rest>
  if (urlPath.startsWith('/framework/')) return 'framework/' + urlPath.slice('/framework/'.length);
  // /games/<id>/<rest...> → games/<id>/<rest>
  if (urlPath.startsWith('/games/')) return 'games/' + urlPath.slice('/games/'.length);
  return null;
}

// Resolve a request to an HTTP response Buffer. `deps`:
//   readAsset(relPath) -> Promise<Buffer>   (throws if missing)
//   getLanIp() -> string|null
//   debug -> boolean
async function handleRequest(req, deps) {
  const urlPath = pathOf(req.url);

  if (req.method === 'OPTIONS') {
    return buildResponse(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }, null);
  }

  // LAN IP discovery (parity with dev server /api/local-ip).
  if (urlPath === '/api/local-ip') {
    const ip = deps.getLanIp ? deps.getLanIp() : null;
    return buildResponse(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      Buffer.from(JSON.stringify({ ip }), 'utf8'));
  }

  const file = assetForPath(urlPath);
  if (!file) return buildResponse(404, { 'Content-Type': 'text/plain' }, Buffer.from('Not found: ' + urlPath, 'utf8'));

  let data;
  try { data = await deps.readAsset(file); }
  catch (e) { return buildResponse(404, { 'Content-Type': 'text/plain' }, Buffer.from('Not found: ' + urlPath, 'utf8')); }

  const ext = extOf(file);
  const headers = {
    'Content-Type': MIME[ext] || 'text/plain',
    // HTML/CSS change per release → never cache; other assets are versioned by the
    // app build → cache hard for fast loads.
    'Cache-Control': (ext === '.html' || ext === '.css') ? 'no-store' : 'public, max-age=31536000',
  };
  return buildResponse(200, headers, data);
}

module.exports = { MIME, parseHead, isWebSocketUpgrade, pathOf, parseQuery, buildResponse, assetForPath, handleRequest };
