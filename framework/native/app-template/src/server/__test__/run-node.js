'use strict';
/*
 * Node test harness for the on-device tcp-socket server (src/server/*).
 * Proves the pure-JS server against the REAL framework + game files, before any
 * Android build. Injects a fake TcpSocket (thin wrapper over Node `net`) and an
 * fs-backed readAsset, then runs:
 *   1. WS handshake accept-key matches the RFC 6455 vector
 *   2. FrameParser round-trips masked client frames (incl. chunk-split)
 *   3. relay.js logic: pair, relay both ways, reclaim→screen_rejoined, superseded,
 *      ephemeral no-evict, idempotent close guard
 *   4. end-to-end over TCP with a real `ws` client: HTTP routes + WS pair + relay
 *
 * Run:  node framework/native/app-template/src/server/__test__/run-node.js
 * Exit 0 = all pass, 1 = any fail.
 */
const net = require('net');
const fs = require('fs');
const path = require('path');
const { Buffer } = require('buffer');
const WebSocket = require('ws');

const wsproto = require('../wsproto');
const { createRelay } = require('../relay');
const { startServer } = require('../index');

const REPO_ROOT = path.resolve(__dirname, '../../../../../..');
const TEST_PORT = 3999; // avoid clashing with a running dev server on 3000

let pass = 0, fail = 0;
function ok(name, cond) { if (cond) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name); } }
function section(t) { console.log('\n' + t); }

// ── fake TcpSocket (Node net) ────────────────────────────────────────────────
function fakeTcp() {
  return {
    createServer(listener) {
      const srv = net.createServer((sock) => listener(sock));
      return {
        listen(opts, cb) { srv.listen(opts.port, opts.host || '0.0.0.0', cb); },
        on(evt, fn) { srv.on(evt, fn); },
        close() { try { srv.close(); } catch (_) {} },
        _srv: srv,
      };
    },
  };
}

// fs-backed readAsset: web/framework/* → repo framework/*, web/games/* → repo games/*
async function fsReadAsset(rel) {
  let abs;
  if (rel.startsWith('framework/')) abs = path.join(REPO_ROOT, 'framework', rel.slice('framework/'.length));
  else if (rel.startsWith('games/')) abs = path.join(REPO_ROOT, 'games', rel.slice('games/'.length));
  else throw new Error('no such asset: ' + rel);
  return fs.promises.readFile(abs);
}

// ── fake conn for relay unit tests ───────────────────────────────────────────
function fakeConn() {
  const c = { readyState: 1, isAlive: true, sent: [] };
  c.send = (t) => { c.sent.push(t); };
  c.close = () => { c.readyState = 3; };
  c.terminate = () => { c.readyState = 3; };
  c.last = () => { try { return JSON.parse(c.sent[c.sent.length - 1]); } catch (_) { return null; } };
  c.types = () => c.sent.map((s) => { try { return JSON.parse(s).type; } catch (_) { return s; } });
  return c;
}
function q(obj) { return { get: (k) => (k in obj ? obj[k] : null) }; }

function testHandshake() {
  section('1. WS handshake (RFC 6455 vector)');
  ok('computeAccept matches spec vector',
    wsproto.computeAccept('dGhlIHNhbXBsZSBub25jZQ==') === 's3pPLMBiTxaQ9kYGzzhZRbK+xOo=');
}

// Build a masked client text frame (client→server frames MUST be masked).
function maskedTextFrame(str) {
  const payload = Buffer.from(str, 'utf8');
  const len = payload.length;
  let header;
  if (len < 126) { header = Buffer.alloc(2); header[1] = 0x80 | len; }
  else { header = Buffer.alloc(4); header[1] = 0x80 | 126; header.writeUInt16BE(len, 2); }
  header[0] = 0x81; // FIN + text
  const mask = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const masked = Buffer.alloc(len);
  for (let i = 0; i < len; i++) masked[i] = payload[i] ^ mask[i & 3];
  return Buffer.concat([header, mask, masked]);
}

function testFrameParser() {
  section('2. FrameParser round-trip');
  const p = new wsproto.FrameParser(64 * 1024);
  const frame = maskedTextFrame('{"type":"hello"}');
  const evs = p.feed(frame);
  ok('decodes one text frame', evs.length === 1 && evs[0].type === 'text');
  ok('unmasks payload correctly', evs[0] && evs[0].data === '{"type":"hello"}');

  // chunk-split: feed the frame one byte at a time
  const p2 = new wsproto.FrameParser(64 * 1024);
  const big = maskedTextFrame(JSON.stringify({ type: 'shot', runs: 6, pad: 'x'.repeat(300) }));
  let split = [];
  for (let i = 0; i < big.length; i++) split = split.concat(p2.feed(big.slice(i, i + 1)));
  ok('reassembles across single-byte chunks (16-bit len)', split.length === 1 && split[0].type === 'text');
  ok('chunk-split payload intact', split[0] && JSON.parse(split[0].data).runs === 6);

  // oversize guard
  const p3 = new wsproto.FrameParser(16);
  const overEvs = p3.feed(maskedTextFrame('x'.repeat(64)));
  ok('rejects payload over maxPayload', overEvs.some((e) => e.type === 'error'));
}

function testRelay() {
  section('3. relay.js logic (fake conns)');
  const relay = createRelay({ onEvent: () => {} });

  // pair
  const screen = fakeConn();
  relay.handleOpen(screen, 'screen', q({ room: '', game: 'cricswing' }));
  const created = screen.last();
  ok('screen gets room_created + code', created && created.type === 'room_created' && /^[A-Z2-9]{4}$/.test(created.code));
  const code = created.code;

  const bat = fakeConn();
  relay.handleOpen(bat, 'bat', q({ room: code, game: 'cricswing' }));
  ok('bat gets role', bat.last() && bat.last().type === 'role');
  ok('screen told bat_connected', screen.types().includes('bat_connected'));

  // relay both ways
  relay.handleMessage(bat, JSON.stringify({ type: 'shot', runs: 4 }));
  ok('bat→screen relayed', screen.sent.some((s) => s.includes('"shot"')));
  relay.handleMessage(screen, JSON.stringify({ type: 'game_state', runs: 4 }));
  ok('screen→bat relayed', bat.sent.some((s) => s.includes('"game_state"')));

  // screen reclaim → screen_rejoined to bat
  const screen2 = fakeConn();
  relay.handleOpen(screen2, 'screen', q({ room: code, game: 'cricswing' }));
  const rc2 = screen2.sent.map((s) => { try { return JSON.parse(s); } catch (_) { return {}; } }).find((m) => m.type === 'room_created');
  ok('reclaim marks rejoined', rc2 && rc2.rejoined === true);
  ok('bat told screen_rejoined', bat.types().includes('screen_rejoined'));
  ok('old screen terminated', screen.readyState === 3);

  // superseded: a new real bat evicts the old one
  const bat2 = fakeConn();
  relay.handleOpen(bat2, 'bat', q({ room: code }));
  ok('old bat told superseded', bat.types().includes('error') && bat.sent.some((s) => s.includes('superseded')));

  // ephemeral bat does NOT evict the live bat
  const eph = fakeConn();
  const before = bat2.sent.length;
  relay.handleOpen(eph, 'bat', q({ room: code, ephemeral: '1' }));
  ok('ephemeral does not supersede live bat', bat2.sent.length === before);

  // idempotent close guard: closing a stale (already-superseded) bat must not null the current bat
  relay.handleClose(bat);
  ok('stale-bat close is a no-op', relay.rooms.get(code) && relay.rooms.get(code).bat === eph || relay.rooms.get(code).bat === bat2);

  // errors
  const orphanBat = fakeConn();
  relay.handleOpen(orphanBat, 'bat', q({ room: 'ZZZZ' }));
  ok('bat to missing room → room_not_found', orphanBat.last() && orphanBat.last().code === 'room_not_found');

  relay.stop();
}

function httpGet(port, urlPath) {
  return new Promise((resolve, reject) => {
    const sock = net.connect(port, '127.0.0.1', () => {
      sock.write('GET ' + urlPath + ' HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n');
    });
    let buf = Buffer.alloc(0);
    sock.on('data', (d) => { buf = Buffer.concat([buf, d]); });
    sock.on('close', () => {
      const text = buf.toString('latin1');
      const status = parseInt((text.split('\r\n')[0] || '').split(' ')[1], 10);
      const bodyIdx = text.indexOf('\r\n\r\n');
      resolve({ status, headers: text.slice(0, bodyIdx), body: buf.slice(bodyIdx + 4) });
    });
    sock.on('error', reject);
  });
}

async function testE2E() {
  section('4. end-to-end over TCP (fake TcpSocket + ws client)');
  const srv = startServer({
    port: TEST_PORT,
    tcp: fakeTcp(),
    readAsset: fsReadAsset,
    getLanIp: () => '192.168.1.42',
    onEvent: () => {},
  });
  await new Promise((r) => setTimeout(r, 250)); // let it listen

  try {
    // HTTP routes
    const ip = await httpGet(TEST_PORT, '/api/local-ip');
    ok('/api/local-ip → 200 + ip', ip.status === 200 && ip.body.toString().includes('192.168.1.42'));

    const scr = await httpGet(TEST_PORT, '/games/cricswing/screen.html');
    ok('/games/cricswing/screen.html → 200 html', scr.status === 200 && scr.headers.includes('text/html') && scr.body.toString().includes('<'));

    const css = await httpGet(TEST_PORT, '/framework/ui/framework.css');
    ok('/framework/ui/framework.css → 200 css', css.status === 200 && css.headers.includes('text/css'));

    const miss = await httpGet(TEST_PORT, '/games/cricswing/nope.xyz');
    ok('missing asset → 404', miss.status === 404);

    const trav = await httpGet(TEST_PORT, '/games/../framework/core/server.js');
    ok('path traversal → 404', trav.status === 404);

    // WS pair + relay with a real ws client (exercises handshake + framing + relay)
    await new Promise((resolve, reject) => {
      const to = setTimeout(() => reject(new Error('ws e2e timeout')), 4000);
      const base = `ws://127.0.0.1:${TEST_PORT}`;
      const screen = new WebSocket(base + '/ws/screen?room=&game=cricswing');
      let code = null;
      screen.on('message', (m) => {
        const d = JSON.parse(m.toString());
        if (d.type === 'room_created') {
          code = d.code;
          ok('ws: screen got room_created', /^[A-Z2-9]{4}$/.test(code));
          const bat = new WebSocket(base + '/ws/bat?room=' + code + '&game=cricswing');
          bat.on('message', (bm) => {
            const bd = JSON.parse(bm.toString());
            if (bd.type === 'role') { setTimeout(() => bat.send(JSON.stringify({ type: 'shot', runs: 6 })), 30); }
          });
        }
        if (d.type === 'bat_connected') ok('ws: screen got bat_connected', true);
        if (d.type === 'shot') { ok('ws: bat→screen shot relayed', d.runs === 6); clearTimeout(to); screen.close(); resolve(); }
      });
      screen.on('error', (e) => { clearTimeout(to); reject(e); });
    });
  } finally {
    srv.stop();
  }
}

(async () => {
  testHandshake();
  testFrameParser();
  testRelay();
  try { await testE2E(); } catch (e) { fail++; console.log('  ✗ e2e threw: ' + e.message); }

  console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail === 0 ? 0 : 1);
})();
