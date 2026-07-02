'use strict';
// Room lifecycle + bat↔screen relay — behavior-ported 1:1 from the framework dev
// server (framework/core/websocket.js + room-manager.js) so the on-device server
// honors the exact same protocol/reconnect contract. Transport-neutral: it works
// on `conn` objects ({ send(text), close(), terminate(), readyState, isAlive })
// so the same logic drives react-native-tcp-socket on device and a fake socket in
// the Node test harness. index.js wraps each TCP socket as a conn (see makeConn).
//
// Protocol (lowercase): room_created, role, bat_connected, bat_disconnected,
// screen_disconnected, screen_rejoined, error{room_not_found|tv_offline|superseded}.
// onEvent({type:'room-created',code}) / onEvent({type:'screen-disconnected'}) mirror
// the two native-shell signals the old rn-bridge sent (App.tsx consumes them).

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_IDLE_MS = 1800000;   // 30 min
const CULL_EVERY_MS = 60000;    // sweep cadence (matches dev server setInterval)
const RATE_MAX = 40;            // messages per 1s window per socket

function createRelay(opts = {}) {
  const onEvent = typeof opts.onEvent === 'function' ? opts.onEvent : function () {};
  const enrich = opts.enrich || null;   // optional { freshRoomFields, applyViewport, noteGameState, enrichOutgoingShot }
  const rooms = new Map();

  const emit = (ev) => { try { onEvent(ev); } catch (_) {} };

  function genCode() {
    let code;
    do {
      code = '';
      for (let i = 0; i < 4; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    } while (rooms.has(code));
    return code;
  }

  function getRoom(code) { return code ? rooms.get(String(code).toUpperCase()) : null; }

  function createRoom(code) {
    if (rooms.has(code)) return rooms.get(code);
    const room = { code, screen: null, bat: null, created: Date.now(), lastActivity: Date.now(), meta: {}, gameId: null };
    // Optional game-specific fields (viewport/tvTarget/milestoneState…) — same as dev server.
    if (enrich && typeof enrich.freshRoomFields === 'function') {
      try { const f = enrich.freshRoomFields(); for (const k of Object.keys(f)) if (!(k in room)) room[k] = f[k]; } catch (_) {}
    }
    rooms.set(code, room);
    return room;
  }

  function deleteRoom(code) {
    const room = rooms.get(code);
    if (!room) return false;
    try { if (room.screen) room.screen.terminate(); } catch (_) {}
    try { if (room.bat) room.bat.terminate(); } catch (_) {}
    return rooms.delete(code);
  }

  // Per-socket flood guard: ~RATE_MAX msgs per 1s window, else drop.
  function rateOk(conn) {
    const now = Date.now();
    if (!conn._rlStart || now - conn._rlStart > 1000) { conn._rlStart = now; conn._rlCount = 0; }
    conn._rlCount++;
    return conn._rlCount <= RATE_MAX;
  }

  // ── open ──────────────────────────────────────────────────────────────────
  function handleOpen(conn, role, query) {
    if (role === 'screen') openScreen(conn, query);
    else if (role === 'bat') openBat(conn, query);
    else { try { conn.close(); } catch (_) {} }
  }

  function openScreen(conn, query) {
    const wantedCode = (query.get('room') || '').toUpperCase();
    const gameId = query.get('game');
    let room = getRoom(wantedCode);
    let rejoined = false;

    if (room) {
      // Reclaim: replace stale screen socket (TV refreshed).
      if (room.screen && room.screen !== conn) { try { room.screen.terminate(); } catch (_) {} }
      room.screen = conn;
      rejoined = true;
      // Ask the phone to rebroadcast state so the reconnecting TV repaints.
      if (room.bat && room.bat.readyState === 1) {
        try { room.bat.send(JSON.stringify({ type: 'screen_rejoined' })); } catch (_) {}
      }
    } else {
      const code = (/^[A-Z2-9]{4}$/.test(wantedCode) && !rooms.has(wantedCode)) ? wantedCode : genCode();
      room = createRoom(code);
      room.screen = conn;
    }

    if (gameId) room.gameId = gameId;
    conn._code = room.code;

    try { conn.send(JSON.stringify({ type: 'room_created', code: room.code, rejoined })); } catch (_) {}
    // TV refreshed into a room whose phone is still here → tell it so it leaves the
    // pairing overlay (controller re-sends state on screen_rejoined).
    if (rejoined && room.bat && room.bat.readyState === 1) {
      try { conn.send(JSON.stringify({ type: 'bat_connected' })); } catch (_) {}
    }
    emit({ type: 'room-created', code: room.code });
  }

  function openBat(conn, query) {
    const code = (query.get('room') || '').toUpperCase();
    const gameId = query.get('game');
    const room = getRoom(code);

    if (!room) {
      try { conn.send(JSON.stringify({ type: 'error', code: 'room_not_found', msg: 'Room not found. Check TV code.' })); } catch (_) {}
      setTimeout(() => { try { conn.close(); } catch (_) {} }, 200);
      return;
    }
    if (!room.screen) {
      try { conn.send(JSON.stringify({ type: 'error', code: 'tv_offline', msg: 'TV screen is offline. Refresh TV browser.' })); } catch (_) {}
      setTimeout(() => { try { conn.close(); } catch (_) {} }, 200);
      return;
    }

    if (gameId) room.gameId = gameId;

    const incomingEphemeral = query.get('ephemeral') === '1';
    const oldBat = room.bat;
    // A real (non-ephemeral) phone evicts the existing one; ephemeral lobby pings never do.
    if (!incomingEphemeral && oldBat && oldBat !== conn && oldBat.readyState === 1) {
      try { oldBat.send(JSON.stringify({ type: 'error', code: 'superseded', msg: 'Another phone joined. Session ended.' })); } catch (_) {}
      setTimeout(() => { try { if (oldBat.readyState === 1) oldBat.close(); } catch (_) {} }, 200);
    }

    room.bat = conn;
    conn._code = room.code;
    conn._connAt = Date.now();
    conn._ephemeral = incomingEphemeral;

    try { conn.send(JSON.stringify({ type: 'role', role: 'bat' })); } catch (_) {}
    if (room.screen.readyState === 1) {
      try { room.screen.send(JSON.stringify({ type: 'bat_connected' })); } catch (_) {}
    }
  }

  // ── message ─────────────────────────────────────────────────────────────────
  function handleMessage(conn, txt) {
    const r = getRoom(conn._code);
    if (!r) return;
    if (!rateOk(conn)) return;
    r.lastActivity = Date.now();

    if (r.screen === conn) {
      // Screen → phone. Drop wake probes + diagnostics.
      if (txt.indexOf('"__ping"') !== -1) return;
      if (txt.indexOf('"__dbg"') !== -1) return;
      if (r.bat && r.bat.readyState === 1) { try { r.bat.send(txt); } catch (_) {} }
      return;
    }

    if (r.bat === conn) {
      // Phone → screen, with optional enrichment.
      if (txt.indexOf('"__dbg"') !== -1) return;
      let outgoing = txt;
      if (enrich) {
        let payload = null;
        try { payload = JSON.parse(txt); } catch (_) { payload = null; }
        if (payload) {
          try {
            if (payload.type === 'viewport' && enrich.applyViewport) enrich.applyViewport(r, payload);
            if ((payload.type === 'game_start' || payload.type === 'game_resume') && enrich.noteGameState) enrich.noteGameState(r, payload);
            if ((payload.type === 'shot' || payload.type === 'training_swing') && enrich.enrichOutgoingShot) {
              const res = enrich.enrichOutgoingShot(r, payload, r.code);
              if (res !== undefined) payload = res;
            }
            outgoing = JSON.stringify(payload);
          } catch (_) { outgoing = txt; }
        }
      }
      if (r.screen && r.screen.readyState === 1) { try { r.screen.send(outgoing); } catch (_) {} }
    }
  }

  // ── close ─────────────────────────────────────────────────────────────────
  function handleClose(conn) {
    const r = getRoom(conn._code);
    if (!r) return;
    // Idempotent guard: only act if THIS socket is still the room's current screen/bat.
    if (r.screen === conn) {
      r.screen = null;
      if (r.bat && r.bat.readyState === 1) { try { r.bat.send(JSON.stringify({ type: 'screen_disconnected' })); } catch (_) {} }
      if (!r.bat) deleteRoom(conn._code);
      emit({ type: 'screen-disconnected' });
    } else if (r.bat === conn) {
      r.bat = null;
      if (!conn._ephemeral && r.screen && r.screen.readyState === 1) {
        try { r.screen.send(JSON.stringify({ type: 'bat_disconnected' })); } catch (_) {}
      }
      if (!r.screen) deleteRoom(conn._code);
    }
  }

  // ── idle cull (matches dev server sweep: 10 min zombie / 30 min idle) ───────
  function sweep() {
    const now = Date.now();
    const cut = now - 600000;
    for (const [code, room] of rooms) {
      const screenAlive = room.screen && room.screen.readyState === 1;
      const batAlive = room.bat && room.bat.readyState === 1;
      if (screenAlive || batAlive) continue;
      const createdOld = room.created < cut;
      const idle = (now - (room.lastActivity || room.created)) > ROOM_IDLE_MS;
      if (createdOld && idle) deleteRoom(code);
    }
  }
  const cullTimer = setInterval(sweep, CULL_EVERY_MS);

  function stop() { clearInterval(cullTimer); for (const code of Array.from(rooms.keys())) deleteRoom(code); }

  return { handleOpen, handleMessage, handleClose, sweep, stop, rooms, genCode };
}

module.exports = { createRelay, ROOM_IDLE_MS };
