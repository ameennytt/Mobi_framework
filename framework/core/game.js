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
    this.stageName = null;      // current lifecycle stage (see STAGES)
    this._lifecycleWired = false;
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
   * Load a game's code, simple OR modular, from its `game-config.json`.
   *
   * Small games keep one `gameplay.js`. Larger (CricSwing-scale) games split into
   * a `gameplay/` folder (+ optional `extensions/`) and list the load order in
   * config under `code: [...]` — paths relative to the game dir, loaded in order,
   * the last one being the entry that defines `window.Gameplay`. With no `code`
   * field this falls back to `gameplay.js`, so existing games keep working.
   *
   * Call this once before init() in screen.html (the TV runs the rules):
   *   await FrameworkGame.loadGameplay();
   *
   * @param {string} [explicitId] override the URL-derived game id
   * @returns {Promise<void>}
   */
  async loadGameplay(explicitId) {
    const id = this._resolveGameId(explicitId) || this.gameId;
    let list = ['gameplay.js'];
    try {
      const cfg = await fetch(`/games/${id}/game-config.json`).then(r => r.json());
      if (Array.isArray(cfg.code) && cfg.code.length) list = cfg.code;
    } catch (_) {}
    for (const rel of list) {
      await this._injectScript(`/games/${id}/${rel}`);
    }
  }

  _injectScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
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

    // 2b. Track match-in-progress generically (drives the away overlays below). A live
    // game emits game_state; game_over ends it. Works on both roles (screen sends,
    // bat receives — both see the message on their socket).
    this.inMatch = false;
    window.FrameworkEvents.on('game_state', () => { this.inMatch = true; });
    window.FrameworkEvents.on('game_over', () => { this.inMatch = false; });

    // 3. Socket lifecycle hooks shared by both roles.
    window.FrameworkEvents.on('sys:connected', () => {
      // Phone: clear the "TV away" overlay once the link is back.
      if (autoOverlay && this.role === 'bat' && window.FrameworkTemplates && window.FrameworkTemplates.hideMobileAway) {
        window.FrameworkTemplates.hideMobileAway();
      }
      if (cfg.onConnect) cfg.onConnect();
    });
    window.FrameworkEvents.on('sys:disconnected', () => {
      if (autoOverlay && this.role === 'screen' && this.paired) {
        // TV shows a passive reconnect notice; event-hub auto-reconnects.
        window.FrameworkUI && window.FrameworkUI.showToast('Reconnecting…', 2500, true);
      }
      // Phone, mid-match: show the "TV away" overlay (auto-resumes on reconnect).
      if (autoOverlay && this.role === 'bat' && this.inMatch && window.FrameworkTemplates && window.FrameworkTemplates.renderMobileAway) {
        window.FrameworkTemplates.renderMobileAway({ message: 'TV disconnected' });
      }
      if (cfg.onDisconnect) cfg.onDisconnect();
    });
    // Permanent disconnect (reconnect tries exhausted) → full-screen re-pair prompt on TV.
    window.FrameworkEvents.on('sys:re-pair-required', () => {
      if (autoOverlay && this.role === 'screen' && window.FrameworkTemplates && window.FrameworkTemplates.renderTVDisconnected) {
        window.FrameworkTemplates.renderTVDisconnected({ message: 'Connection lost — re-pair on your phone' });
      }
      if (cfg.onRePair) cfg.onRePair();
    });

    if (this.role === 'screen') {
      this._initScreen(cfg, autoOverlay);
    } else {
      await this._initBat(cfg, autoOverlay);
    }

    // Lifecycle: wire framework-owned transitions, then enter 'boot'.
    this._wireLifecycle();
    this.stage('boot');

    return this._api();
  }

  _initScreen(cfg, autoOverlay) {
    // TV surface uses Selawik (Segoe-consistent across devices, like CricSwing's TV);
    // the phone keeps the device's native font. Scoped via this body class in CSS.
    try { document.body.classList.add('fw-tv-surface'); } catch (_) {}

    // Canvas renderer (optional — a DOM-only TV can skip it).
    if (cfg.canvas && window.FrameworkRenderer) {
      window.FrameworkRenderer.init(cfg.canvas, cfg.draw);
      window.FrameworkRenderer.start();
    }

    // TV setup mirror: the phone relays `lobby_step` while the player picks team/
    // format/kicks off. Wired here so every game inherits it (no per-game code).
    // The overlay auto-hides when a game HUD renders (FrameworkTemplates).
    window.FrameworkEvents.on('lobby_step', (d) => {
      if (window.FrameworkTemplates && window.FrameworkTemplates.showTVSetup) {
        window.FrameworkTemplates.showTVSetup(d);
      }
    });

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
      if (autoOverlay && window.FrameworkTemplates && window.FrameworkTemplates.hideTVAway) window.FrameworkTemplates.hideTVAway();
      if (cfg.onPaired) cfg.onPaired();
    });

    window.FrameworkEvents.on('bat_disconnected', () => {
      this.paired = false;
      // Mid-match → passive "player stepped out" overlay (match resumes on reconnect).
      // Pre-match → the pairing code, so a new phone can join.
      if (autoOverlay) {
        if (this.inMatch && window.FrameworkTemplates && window.FrameworkTemplates.renderTVAway) {
          window.FrameworkTemplates.renderTVAway({ message: 'Player stepped out' });
        } else if (window.FrameworkUI) {
          window.FrameworkUI.renderPairingOverlay(this.code, 'waiting', cfg.qrUrl || '');
        }
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

  /**
   * Standard game lifecycle stage. Optional — games name their phases from this set
   * instead of inventing their own. The framework auto-fires the ones it owns
   * (boot on init; paused/resume from the RN app background/foreground; destroy on
   * unload); the game drives the rest with `game.stage('match')` etc. Each call sets
   * the current stage, invokes `window.Gameplay[name](data)` if the game defines it,
   * and dispatches a `framework:stage` CustomEvent. Unknown names are ignored.
   */
  stage(name, data) {
    if (!FrameworkGameClass.STAGES.has(name)) { console.warn('[FrameworkGame] unknown stage:', name); return; }
    this.stageName = name;
    try { if (window.Gameplay && typeof window.Gameplay[name] === 'function') window.Gameplay[name](data); }
    catch (e) { console.error('[FrameworkGame] stage handler error (' + name + '):', e); }
    try { window.dispatchEvent(new CustomEvent('framework:stage', { detail: { name, data } })); } catch (_) {}
  }

  /** Wire the framework-owned stage transitions once. */
  _wireLifecycle() {
    if (this._lifecycleWired) return;
    this._lifecycleWired = true;
    // The RN shell dispatches these into the WebView on app background/foreground.
    window.addEventListener('__appBackground', () => this.stage('paused'));
    window.addEventListener('__appForeground', () => this.stage('resume'));
    window.addEventListener('pagehide', () => this.stage('destroy'));
  }

  /**
   * Persist the TV's latest game_state as the resume snapshot, and clear it on
   * game_over. Keyed to the room so a different room never resumes a stale match.
   * framework_game_state is a monitored key → mirrored to localStorage (survives kill).
   */
  _persistFromSend(type, payload) {
    if (this.role !== 'screen' || !window.FrameworkStorage) return;
    try {
      if (type === 'game_state') {
        window.FrameworkStorage.save('framework_game_state', { room: this.code, snap: payload || {} });
      } else if (type === 'game_over') {
        window.FrameworkStorage.remove('framework_game_state');
      }
    } catch (_) {}
  }

  /** Return the saved resume snapshot for THIS room, or null. */
  loadSavedState() {
    if (!window.FrameworkStorage) return null;
    try {
      const s = window.FrameworkStorage.load('framework_game_state');
      return (s && s.room === this.code) ? s.snap : null;
    } catch (_) { return null; }
  }

  _api() {
    return {
      send: (type, payload) => { this._persistFromSend(type, payload); return window.FrameworkEvents.send(type, payload); },
      on: (type, fn) => window.FrameworkEvents.on(type, fn),
      off: (type, fn) => window.FrameworkEvents.off(type, fn),
      connect: (code, onPaired, ephemeral) => this.connect(code, onPaired, ephemeral),
      getCode: () => this.code,
      isPaired: () => this.paired,
      loadSavedState: () => this.loadSavedState(),
      stage: (name, data) => this.stage(name, data),
      getStage: () => this.stageName,
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

// Standard lifecycle stages (optional, opt-in per game). boot/paused/resume/destroy
// are auto-fired by the framework; the rest the game calls via game.stage(name).
FrameworkGameClass.STAGES = new Set([
  'boot', 'loading', 'menu', 'calibration', 'match', 'paused', 'result', 'resume', 'destroy',
]);

if (typeof window !== 'undefined') {
  window.FrameworkGame = new FrameworkGameClass();

  // Namespaced view of the framework globals — window.Framework.Game, .Arena, etc.
  // Lazy getters so script load order doesn't matter; the flat globals
  // (window.FrameworkGame, window.FrameworkArena, …) remain as aliases. New code can
  // prefer Framework.*; existing code keeps working unchanged.
  window.Framework = window.Framework || {};
  Object.defineProperties(window.Framework, {
    Game:      { configurable: true, get: () => window.FrameworkGame },
    Flow:      { configurable: true, get: () => window.FrameworkFlow },
    Events:    { configurable: true, get: () => window.FrameworkEvents },
    Router:    { configurable: true, get: () => window.FrameworkRouter },
    Storage:   { configurable: true, get: () => window.FrameworkStorage },
    Theme:     { configurable: true, get: () => window.FrameworkTheme },
    Assets:    { configurable: true, get: () => window.FrameworkAssets },
    UI:        { configurable: true, get: () => window.FrameworkUI },
    Templates: { configurable: true, get: () => window.FrameworkTemplates },
    Renderer:  { configurable: true, get: () => window.FrameworkRenderer },
    Layers:    { configurable: true, get: () => window.FrameworkLayers },
    Perf:      { configurable: true, get: () => window.TvPerfManager },
    Arena:     { configurable: true, get: () => window.FrameworkArena },
    Fields:    { configurable: true, get: () => window.FrameworkFields },
    Motion:    { configurable: true, get: () => window.FrameworkMotion },
    Projectile:{ configurable: true, get: () => window.Projectile || window.ShotVisuals },
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.FrameworkGame;
}
