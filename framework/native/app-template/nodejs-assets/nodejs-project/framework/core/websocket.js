'use strict';

/**
 * WebSocket relay + room lifecycle (Node).
 *
 * One room = one TV (screen) + one phone (bat), matched by a 6-char code. This
 * layer accepts /ws/screen and /ws/bat connections, pairs them, and forwards
 * every message between them. It also manages reconnect: a refreshed TV reclaims
 * its room (and is told `bat_connected` if the phone is still there); a dropped
 * phone fires `bat_disconnected`. Optional per-game enrichment middleware can
 * mutate relayed messages (see loadGameEnrichment / games/<id>/shared/relay-enrich.js).
 *
 * Protocol is lowercase: room_created, role, bat_connected, bat_disconnected,
 * screen_disconnected, screen_rejoined, error. Native hook: global.__rnBridge is
 * notified on room-created / screen-disconnected. window globals: none (server-side).
 */

const { WebSocketServer } = require('ws');
const roomManager = require('./room-manager');

class WebSocketLayer {
  constructor() {
    this.wss = null;
    this.heartbeatInterval = null;
    this.enrichmentMiddlewares = []; // Optional hooks to mutate relayed events
    this.loadedEnrichments = new Set();
  }

  /**
   * Registers a middleware hook to enrich/intercept messages of a specific type.
   * Signature: (room, msg) => void (mutates msg in place or returns new msg)
   */
  use(fn) {
    if (typeof fn === 'function') {
      this.enrichmentMiddlewares.push(fn);
    }
  }

  /**
   * Dynamically loads game-specific enrichment rules (like CricSwing's physics and visual calculators)
   * and initializes room states if provided by the game.
   */
  loadGameEnrichment(gameId, room) {
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, '..', '..', 'games', gameId, 'game-config.json');

    let enableEnrichment = true; // default fallback
    try {
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        enableEnrichment = config.enableEnrichment !== false;
      }
    } catch (e) {
      console.warn(`[Websocket] Failed to read manifest for ${gameId}:`, e.message);
    }

    if (!enableEnrichment) return; // skip enrichment if disabled in manifest

    const enrichPath = path.join(__dirname, '..', '..', 'games', gameId, 'shared', 'relay-enrich.js');

    if (fs.existsSync(enrichPath)) {
      try {
        const enrichModule = require(enrichPath);

        // Initialize game-specific room fields on the room object
        if (typeof enrichModule.freshRoomFields === 'function') {
          const fields = enrichModule.freshRoomFields();
          for (const key of Object.keys(fields)) {
            if (!(key in room)) {
              room[key] = fields[key];
            }
          }
        }

        // Register enrichment middlewares for this game if not already registered
        if (!this.loadedEnrichments.has(gameId)) {
          this.loadedEnrichments.add(gameId);

          this.use((r, payload) => {
            // Only apply this middleware to rooms playing this specific game
            if (r.gameId !== gameId) return payload;

            // CricSwing specific: enrich shot-visuals & training swings
            if (payload.type === 'shot' || payload.type === 'training_swing') {
              if (typeof enrichModule.enrichOutgoingShot === 'function') {
                return enrichModule.enrichOutgoingShot(r, payload, r.code);
              }
            }

            // General hooks: viewport and state changes
            if (payload.type === 'viewport') {
              if (typeof enrichModule.applyViewport === 'function') {
                enrichModule.applyViewport(r, payload);
              }
            }
            if (payload.type === 'game_start' || payload.type === 'game_resume') {
              if (typeof enrichModule.noteGameState === 'function') {
                enrichModule.noteGameState(r, payload);
              }
            }

            return payload;
          });
        }
      } catch (e) {
        console.error(`[Websocket] Failed to load enrichment for game ${gameId}:`, e);
      }
    }
  }

  init(server) {
    this.wss = new WebSocketServer({ server });

    // Set up heartbeat to detect silently dropped connections
    const HEARTBEAT_MS = 10000;
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          try { ws.terminate(); } catch (_) {}
          return;
        }
        ws.isAlive = false;
        try { ws.ping(); } catch (_) {}
      });
    }, HEARTBEAT_MS);

    this.wss.on('close', () => clearInterval(this.heartbeatInterval));

    this.wss.on('connection', (ws, req) => {
      ws.isAlive = true;
      ws.on('pong', () => { ws.isAlive = true; });

      const url = new URL(req.url, 'http://localhost');
      const role = url.pathname === '/ws/bat' ? 'bat'
                 : url.pathname === '/ws/screen' ? 'screen'
                 : null;

      if (!role) {
        ws.close();
        return;
      }

      if (role === 'screen') {
        this.handleScreenConnection(ws, url);
      } else {
        this.handleBatConnection(ws, url);
      }
    });
  }

  handleScreenConnection(ws, url) {
    const wantedCode = (url.searchParams.get('room') || '').toUpperCase();
    const gameId = url.searchParams.get('game');
    let room = roomManager.getRoom(wantedCode);
    let rejoined = false;

    if (room) {
      // Reclaim room: replace screen socket (e.g. TV refreshed)
      if (room.screen && room.screen !== ws) {
        try { room.screen.terminate(); } catch (_) {}
      }
      room.screen = ws;
      rejoined = true;

      // Ask the mobile controller to rebroadcast state so TV updates
      if (room.bat && room.bat.readyState === 1) {
        try { room.bat.send(JSON.stringify({ type: 'screen_rejoined' })); } catch (_) {}
      }
    } else {
      // Create new room under the re-offered code or a fresh one
      const code = (/^[A-Z2-9]{6}$/.test(wantedCode) && !roomManager.getRoom(wantedCode))
        ? wantedCode
        : roomManager.generateCode();
      room = roomManager.createRoom(code);
      room.screen = ws;
    }

    if (gameId) {
      room.gameId = gameId;
      this.loadGameEnrichment(gameId, room);
    }

    ws._code = room.code;

    // Acknowledge TV pairing
    ws.send(JSON.stringify({ type: 'room_created', code: room.code, rejoined }));
    // If the TV refreshed back into a room whose phone is still connected, tell the
    // reconnecting screen the phone is here so it leaves the pairing overlay and
    // repaints (reconnect-only — the controller re-sends state on screen_rejoined).
    if (rejoined && room.bat && room.bat.readyState === 1) {
      try { ws.send(JSON.stringify({ type: 'bat_connected' })); } catch (_) {}
    }
    // Native shell hook: tell React Native the room code so it can inject
    // __roomCode into the phone WebView (no-op in browser/dev).
    if (global.__rnBridge) { try { global.__rnBridge.send(JSON.stringify({ type: 'room-created', code: room.code })); } catch (_) {} }

    ws.on('message', (raw) => {
      room.lastActivity = Date.now();
      const txt = raw.toString();

      // Screen wake probe or diagnostics log
      if (txt.includes('"__ping"')) return;
      if (txt.includes('"__dbg"')) return; // handled by diagnostics in-browser

      // Forward to phone
      if (room.bat && room.bat.readyState === 1) {
        room.bat.send(txt);
      }
    });

    ws.on('close', () => {
      const r = roomManager.getRoom(ws._code);
      if (r && r.screen === ws) {
        r.screen = null;
        if (r.bat && r.bat.readyState === 1) {
          try { r.bat.send(JSON.stringify({ type: 'screen_disconnected' })); } catch (_) {}
        }
        if (!r.bat) {
          roomManager.deleteRoom(ws._code);
        }
        if (global.__rnBridge) { try { global.__rnBridge.send(JSON.stringify({ type: 'screen-disconnected' })); } catch (_) {} }
      }
    });
  }

  handleBatConnection(ws, url) {
    const code = (url.searchParams.get('room') || '').toUpperCase();
    const gameId = url.searchParams.get('game');
    const room = roomManager.getRoom(code);

    if (!room) {
      ws.send(JSON.stringify({ type: 'error', code: 'room_not_found', msg: 'Room not found. Check TV code.' }));
      setTimeout(() => ws.close(), 200);
      return;
    }

    if (!room.screen) {
      ws.send(JSON.stringify({ type: 'error', code: 'tv_offline', msg: 'TV screen is offline. Refresh TV browser.' }));
      setTimeout(() => ws.close(), 200);
      return;
    }

    if (gameId) {
      room.gameId = gameId;
      this.loadGameEnrichment(gameId, room);
    }

    const incomingEphemeral = url.searchParams.get('ephemeral') === '1';
    const oldBat = room.bat;

    // Evict old controller if a real non-ephemeral connection arrives
    if (!incomingEphemeral && oldBat && oldBat !== ws && oldBat.readyState === 1) {
      try { oldBat.send(JSON.stringify({ type: 'error', code: 'superseded', msg: 'Another phone joined. Session ended.' })); } catch (_) {}
      try { setTimeout(() => { if (oldBat.readyState === 1) oldBat.close(); }, 200); } catch (_) {}
    }

    room.bat = ws;
    ws._code = room.code;
    ws._connAt = Date.now();
    ws._ephemeral = incomingEphemeral;

    ws.send(JSON.stringify({ type: 'role', role: 'bat' }));
    if (room.screen.readyState === 1) {
      room.screen.send(JSON.stringify({ type: 'bat_connected' }));
    }

    ws.on('message', (raw) => {
      room.lastActivity = Date.now();
      const txt = raw.toString();

      // Phone diagnostics logs
      if (txt.includes('"__dbg"')) return;

      let payload;
      try {
        payload = JSON.parse(txt);
      } catch (_) {
        payload = null;
      }

      let outgoing = txt;
      if (payload) {
        // Run message through registered enrichment middlewares
        for (const middleware of this.enrichmentMiddlewares) {
          try {
            const result = middleware(room, payload);
            if (result !== undefined) {
              payload = result;
            }
          } catch (e) {
            console.error('[Websocket Middleware Error]:', e);
          }
        }
        outgoing = JSON.stringify(payload);
      }

      // Forward to TV
      if (room.screen && room.screen.readyState === 1) {
        room.screen.send(outgoing);
      }
    });

    ws.on('close', () => {
      const r = roomManager.getRoom(ws._code);
      if (r && r.bat === ws) {
        r.bat = null;
        if (!ws._ephemeral && r.screen && r.screen.readyState === 1) {
          r.screen.send(JSON.stringify({ type: 'bat_disconnected' }));
        }
        if (!r.screen) {
          roomManager.deleteRoom(ws._code);
        }
      }
    });
  }
}

module.exports = new WebSocketLayer();
