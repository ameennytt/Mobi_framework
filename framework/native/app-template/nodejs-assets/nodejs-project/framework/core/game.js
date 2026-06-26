'use strict';

/**
 * FrameworkGame — the one-call bootstrap that wires a game's plumbing.
 *
 * A game ships three HTML files (screen.html = TV, lobby.html + controller.html
 * = phone). Each calls FrameworkGame.init({ role, ... }) once. The bootstrap
 * handles: theme + asset/text config load, WebSocket connect, pairing overlay,
 * connect/disconnect/reconnect, the canvas renderer (TV), sensor opt-in (phone),
 * and routing game messages to handlers. The developer writes only game rules,
 * drawing, and screen content.
 *
 * Reuses existing framework globals: FrameworkEvents, FrameworkTheme,
 * FrameworkAssets, FrameworkRenderer, FrameworkLayers, TvPerfManager,
 * FrameworkUI, FrameworkMotion, FrameworkStorage.
 *
 * Usage (TV):
 *   const game = await FrameworkGame.init({
 *     role: 'screen',
 *     canvas: 'game-canvas',
 *     draw: (ctx, W, H) => { ... },
 *     onPaired: () => {...},
 *     handlers: { SHOT: (d) => {...} },
 *   });
 *
 * Usage (phone controller):
 *   const game = await FrameworkGame.init({
 *     role: 'bat',
 *     motion: false,
 *     handlers: { game_state: (d) => {...}, game_over: (d) => {...} },
 *   });
 *   game.send('SHOT', { dir: 'left' });
 *
 * Usage (phone lobby — pair after the user types a code):
 *   const game = await FrameworkGame.init({ role: 'bat', autoConnect: false });
 *   game.connect(typedCode, () => location.href = `controller.html?room=${typedCode}`);
 */
class FrameworkGameClass {
  constructor() {
    this.role = null;
    this.gameId = null;
    this.code = '';
    this.paired = false;
    this._cfg = {};
  }

  /** Derive the game id from the URL (/games/<id>/...) unless explicitly given. */
  _resolveGameId(explicit) {
    if (explicit) return explicit;
    const parts = window.location.pathname.split('/');
    const i = parts.indexOf('games');
    return (i !== -1 && parts[i + 1]) ? parts[i + 1] : null;
  }

  _storageKey() {
    return `${this.gameId || 'fw'}_tv_room`;
  }

  /**
   * Boot a surface. Returns a control API once theme + config are loaded.
   * @param {object} cfg
   */
  async init(cfg = {}) {
    this.role = cfg.role === 'screen' ? 'screen' : 'bat';
    this.gameId = this._resolveGameId(cfg.gameId);
    this._cfg = cfg;
    const autoOverlay = cfg.autoOverlay !== false;

    // 1. Theme + asset/text slots (safe no-ops if config missing).
    try { if (window.FrameworkTheme) await window.FrameworkTheme.load(this.gameId); } catch (_) {}
    try { if (window.FrameworkAssets) await window.FrameworkAssets.loadConfig(this.gameId); } catch (_) {}

    // 2. Register game message handlers.
    if (cfg.handlers) {
      for (const type of Object.keys(cfg.handlers)) {
        window.FrameworkEvents.on(type, cfg.handlers[type]);
      }
    }

    // 3. Socket lifecycle hooks shared by both roles.
    window.FrameworkEvents.on('sys:connected', () => { if (cfg.onConnect) cfg.onConnect(); });
    window.FrameworkEvents.on('sys:disconnected', () => {
      if (autoOverlay && this.role === 'screen' && this.paired) {
        // TV shows a passive reconnect notice; event-hub auto-reconnects.
        window.FrameworkUI && window.FrameworkUI.showToast('Reconnecting…', 2500, true);
      }
      if (cfg.onDisconnect) cfg.onDisconnect();
    });

    if (this.role === 'screen') {
      this._initScreen(cfg, autoOverlay);
    } else {
      await this._initBat(cfg, autoOverlay);
    }

    return this._api();
  }

  _initScreen(cfg, autoOverlay) {
    // Canvas renderer (optional — a DOM-only TV can skip it).
    if (cfg.canvas && window.FrameworkRenderer) {
      window.FrameworkRenderer.init(cfg.canvas, cfg.draw);
      window.FrameworkRenderer.start();
    }

    window.FrameworkEvents.on('room_created', (d) => {
      this.code = d.code;
      try { sessionStorage.setItem(this._storageKey(), this.code); } catch (_) {}
      if (autoOverlay && window.FrameworkUI) {
        window.FrameworkUI.renderPairingOverlay(this.code, 'waiting', cfg.qrUrl || '');
      }
      if (cfg.onCode) cfg.onCode(this.code);
    });

    window.FrameworkEvents.on('bat_connected', () => {
      this.paired = true;
      if (autoOverlay && window.FrameworkUI) window.FrameworkUI.hidePairingOverlay();
      if (cfg.onPaired) cfg.onPaired();
    });

    window.FrameworkEvents.on('bat_disconnected', () => {
      this.paired = false;
      if (autoOverlay && window.FrameworkUI) {
        window.FrameworkUI.renderPairingOverlay(this.code, 'waiting', cfg.qrUrl || '');
      }
      if (cfg.onUnpaired) cfg.onUnpaired();
    });

    // Reconnect under the same code after a TV refresh (sticky code).
    let saved = '';
    try { saved = sessionStorage.getItem(this._storageKey()) || ''; } catch (_) {}
    const urlRoom = new URLSearchParams(window.location.search).get('room') || '';
    window.FrameworkEvents.connect(urlRoom || saved || '', 'screen');
  }

  async _initBat(cfg, autoOverlay) {
    window.FrameworkEvents.on('role', () => {
      this.paired = true;
      if (cfg.onPaired) cfg.onPaired();
    });

    window.FrameworkEvents.on('error', (e) => {
      if (autoOverlay && window.FrameworkUI) {
        window.FrameworkUI.showToast(e.msg || 'Connection error', 3500, true);
      }
      if (cfg.onError) cfg.onError(e);
    });

    // Sensors are opt-in (button games skip this entirely).
    if (cfg.motion && window.FrameworkMotion) {
      try {
        const ok = await window.FrameworkMotion.requestPermission();
        if (ok) window.FrameworkMotion.start();
      } catch (_) {}
    }

    // Connect now unless the caller pairs later (lobby waits for a typed code).
    if (cfg.autoConnect !== false) {
      const room = cfg.room || new URLSearchParams(window.location.search).get('room') || '';
      if (room) this.connect(room, cfg.onPaired, !!cfg.ephemeral);
    }
  }

  /** Connect (or re-pair) as a controller to a room code. */
  connect(code, onPaired, ephemeral = false) {
    this.code = (code || '').toUpperCase();
    if (onPaired) window.FrameworkEvents.on('role', onPaired);
    window.FrameworkEvents.connect(this.code, 'bat', ephemeral);
  }

  _api() {
    return {
      send: (type, payload) => window.FrameworkEvents.send(type, payload),
      on: (type, fn) => window.FrameworkEvents.on(type, fn),
      off: (type, fn) => window.FrameworkEvents.off(type, fn),
      connect: (code, onPaired, ephemeral) => this.connect(code, onPaired, ephemeral),
      getCode: () => this.code,
      isPaired: () => this.paired,
      asset: (slot) => window.FrameworkAssets ? window.FrameworkAssets.resolve(slot) : '',
      text: (slot) => window.FrameworkAssets ? window.FrameworkAssets.text(slot) : '',
      // TV result screen (template added in framework/ui/templates.js).
      showResult: (opts) => window.FrameworkTemplates && window.FrameworkTemplates.renderTVResult
        ? window.FrameworkTemplates.renderTVResult(opts)
        : null,
      hideResult: () => window.FrameworkTemplates && window.FrameworkTemplates.hideTVResult
        ? window.FrameworkTemplates.hideTVResult()
        : null,
    };
  }
}

if (typeof window !== 'undefined') {
  window.FrameworkGame = new FrameworkGameClass();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.FrameworkGame;
}
