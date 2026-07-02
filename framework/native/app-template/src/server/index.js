'use strict';
// Embedded game server — the in-app replacement for nodejs-mobile + framework/core/server.js.
// Runs in the SAME RN JS runtime as App.tsx (no separate Node process, so no rn-bridge:
// App passes callbacks directly). Listens on 0.0.0.0:3000 and does BOTH jobs the dev
// server does:
//   (A) HTTP/1.1 static host for the web UI (phone WebView + TV browser) — /framework/*, /games/*
//   (B) WebSocket relay between bat (phone) and screen (TV)
// Transport = react-native-tcp-socket (pure Java, 16 KB-safe). WS framing = ./wsproto.
// Room logic = ./relay (behavior-ported from framework/core/websocket.js + room-manager.js).
//
// Testability: `tcp` (TcpSocket module) and `readAsset` are INJECTABLE. On device the
// defaults use react-native-tcp-socket + react-native-fs; the Node test harness injects
// a fake TCP server (over Node `net`) + an fs-backed readAsset. Behavior is identical.
const { Buffer } = require('buffer');
const wsproto = require('./wsproto');
const httpmod = require('./staticHttp');
const { createRelay } = require('./relay');

const PORT = 3000;
const HEARTBEAT_MS = 10000;
const MAX_PAYLOAD = 64 * 1024;
const ASSET_ROOT = 'web'; // android assets/web (populated by scripts/sync-assets.js)

// Default asset reader (device): react-native-fs base64 → Buffer (uniform text+binary).
function makeRnfsReadAsset() {
  const RNFS = require('react-native-fs');
  const { Platform } = require('react-native');
  return async function readAsset(rel) {
    const safe = rel.replace(/\\/g, '/');
    if (Platform.OS === 'android') {
      const b64 = await RNFS.readFileAssets(ASSET_ROOT + '/' + safe, 'base64');
      return Buffer.from(b64, 'base64');
    }
    const b64 = await RNFS.readFile(RNFS.MainBundlePath + '/' + ASSET_ROOT + '/' + safe, 'base64');
    return Buffer.from(b64, 'base64');
  };
}

// Wrap a raw TCP socket as the transport-neutral `conn` the relay expects.
function makeConn(socket) {
  const conn = {
    isAlive: true,
    readyState: 1, // 1 = OPEN (mirrors WebSocket.OPEN)
    send(text) {
      if (conn.readyState !== 1) return;
      try { socket.write(wsproto.encodeText(text)); } catch (_) {}
    },
    close() {
      if (conn.readyState !== 1) return;
      conn.readyState = 3;
      try { socket.write(wsproto.encodeClose(1000)); } catch (_) {}
      try { socket.end(); } catch (_) {}
    },
    terminate() {
      conn.readyState = 3;
      try { socket.destroy(); } catch (_) {}
    },
  };
  conn._socket = socket;
  return conn;
}

// onEvent(msg): 'server-ready' | {type:'room-created',code} | {type:'screen-disconnected'}
// getLanIp(): string|null  — App supplies this from react-native-network-info.
// tcp / readAsset: injectable for tests (default to RN modules on device).
function startServer({ onEvent, getLanIp, debug, tcp, readAsset, port } = {}) {
  const TcpSocket = tcp || require('react-native-tcp-socket');
  const read = readAsset || makeRnfsReadAsset();
  const listenPort = port || PORT;   // device always uses 3000; tests may override

  // Optional per-game enrichment: bundled into ./shared/relay-enrich.js by sync-assets
  // when a game ships one. Absent (our default) → pass-through relay.
  let enrich = null;
  try { enrich = require('./shared/relay-enrich'); } catch (_) { enrich = null; }

  const wsConns = new Set();
  const relay = createRelay({ onEvent, enrich });
  const httpDeps = { readAsset: read, getLanIp: getLanIp || (() => null), debug: !!debug };

  const server = TcpSocket.createServer((socket) => {
    socket._cs = { mode: 'init', buf: Buffer.alloc(0), parser: null, conn: null };

    socket.on('data', (data) => {
      const st = socket._cs;
      if (!st) return;
      const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data);

      if (st.mode === 'ws') {
        const events = st.parser.feed(chunk);
        for (const ev of events) onWsEvent(socket, ev);
        return;
      }

      // init/http: accumulate until the request head is complete.
      st.buf = st.buf.length ? Buffer.concat([st.buf, chunk]) : chunk;
      const req = httpmod.parseHead(st.buf);
      if (!req) { if (st.buf.length > 32 * 1024) { try { socket.destroy(); } catch (_) {} } return; }

      if (httpmod.isWebSocketUpgrade(req)) { upgradeToWs(socket, req); return; }

      // Plain HTTP — serve, then close (Connection: close).
      st.mode = 'http';
      httpmod.handleRequest(req, httpDeps).then((respBuf) => {
        try { socket.write(respBuf, undefined, () => { try { socket.end(); } catch (_) {} }); }
        catch (_) { try { socket.destroy(); } catch (__) {} }
      }).catch(() => { try { socket.destroy(); } catch (_) {} });
    });

    socket.on('error', () => { teardown(socket); });
    socket.on('close', () => { teardown(socket); });
  });

  function upgradeToWs(socket, req) {
    const st = socket._cs;
    const pathname = httpmod.pathOf(req.url);
    const params = httpmod.parseQuery(req.url);
    const role = pathname === '/ws/bat' ? 'bat' : pathname === '/ws/screen' ? 'screen' : null;
    if (!role) { try { socket.destroy(); } catch (_) {} return; }

    try { socket.write(wsproto.handshakeResponse(req.headers['sec-websocket-key'])); }
    catch (_) { try { socket.destroy(); } catch (__) {} return; }

    st.mode = 'ws';
    st.buf = Buffer.alloc(0);
    st.parser = new wsproto.FrameParser(MAX_PAYLOAD);
    st.conn = makeConn(socket);
    wsConns.add(socket);
    relay.handleOpen(st.conn, role, params);
  }

  function onWsEvent(socket, ev) {
    const st = socket._cs;
    if (!st || !st.conn) return;
    if (ev.type === 'text') { relay.handleMessage(st.conn, ev.data); return; }
    if (ev.type === 'pong') { st.conn.isAlive = true; return; }
    if (ev.type === 'ping') { try { socket.write(wsproto.encodePong(ev.data)); } catch (_) {} return; }
    if (ev.type === 'close' || ev.type === 'error') { try { socket.destroy(); } catch (_) {} }
  }

  function teardown(socket) {
    const st = socket._cs;
    if (!st) return;
    if (st.mode === 'ws' && st.conn) {
      st.conn.readyState = 3;
      try { relay.handleClose(st.conn); } catch (_) {}
      wsConns.delete(socket);
      st.conn = null;
    }
    socket._cs = null;
  }

  // 10s heartbeat (mirror of the dev server): ping every WS client; one that hasn't
  // ponged since the last tick is destroyed so its reconnect timer rebuilds the link.
  const heartbeat = setInterval(() => {
    wsConns.forEach((socket) => {
      const st = socket._cs;
      if (!st || !st.conn) { wsConns.delete(socket); return; }
      if (st.conn.isAlive === false) { try { socket.destroy(); } catch (_) {} return; }
      st.conn.isAlive = false;
      try { socket.write(wsproto.encodePing()); } catch (_) {}
    });
  }, HEARTBEAT_MS);

  server.on('error', (e) => { try { console.warn('[fw-server] listen error', String(e)); } catch (_) {} });
  server.listen({ port: listenPort, host: '0.0.0.0', reuseAddress: true }, () => {
    try { onEvent && onEvent('server-ready'); } catch (_) {}
  });

  return {
    stop() {
      clearInterval(heartbeat);
      try { relay.stop(); } catch (_) {}
      wsConns.forEach((s) => { try { s.destroy(); } catch (_) {} });
      wsConns.clear();
      try { server.close(); } catch (_) {}
    },
  };
}

module.exports = { startServer, makeConn, PORT, MAX_PAYLOAD };
