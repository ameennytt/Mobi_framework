'use strict';

/**
 * FrameworkController — the framework-owned in-match phone controller.
 *
 * Before this existed, every game hand-wrote a ~200-line controller.html (shell,
 * HUD, pause, connection chip, resume, match-end routing — all bespoke). That broke
 * the framework promise ("write only the game"). FrameworkController owns the whole
 * frame; a game supplies ONLY its controls + a little match logic.
 *
 * Two ways in (easy by default, flexible when needed, unlimited if desired):
 *
 *  1. DECLARATIVE (default) — game-config.json `controller: { hud, groups, actions, hint }`:
 *       "controller": {
 *         "hud":     [ { "key":"runs","label":"Runs" }, { "key":"need","label":"Need" } ],
 *         "groups":  [ { "key":"choice","options":[
 *                        {"id":"left","label":"LEG"},
 *                        {"id":"center","label":"STRAIGHT","default":true},
 *                        {"id":"right","label":"OFF"} ] } ],
 *         "actions": [ { "id":"go","label":"PLAY SHOT","primary":true } ],
 *         "hint":    "Pick a direction, then tap PLAY SHOT"
 *       }
 *     groups = selectable button rows (current pick stored per key); actions = buttons
 *     that `game.send('action', { ...selections, ...action.payload })`.
 *
 *  2. JS HOOKS (advanced) — optional `window.Gameplay.controller` object, any of:
 *       start(api)            // first pair → kick off the match (default: send 'start')
 *       startPayload          // object | (params)=>object  (default {})
 *       onState(state, api)   // map game_state → HUD (default: copy hud[key] from state[key])
 *       onOver(data, api)     // game_over → match-end card (default: generic renderMobileMatchEnd)
 *       onAction(id, sel, api)// override an action's send
 *       tips                  // slides for a one-time pre-match coaching carousel
 *       resumeOnReconnect     // default true
 *
 *  3. FULL OVERRIDE (unlimited) — mount({ controlsHtml }) injects your own action-area
 *     DOM, or mount({ render }) replaces the entire shell. Framework still owns pairing,
 *     connection, pause and match-end unless you opt those out too.
 *
 * Stub controller.html is ~12 lines:
 *   await FrameworkGame.loadGameplay();
 *   await FrameworkController.mount();
 *
 * window.FrameworkController.
 */
window.FrameworkController = (function () {
  const T = () => window.FrameworkTemplates;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

  let game = null, cfg = null, cc = null, hooks = null, gid = 'fw';
  let params = null, sel = {}, matchKey = '', tipsKey = '', started = false;
  let activeSource = null;   // non-default input source plugin (motion/ml), if any

  // The ONE place an input becomes a game action. Every source (buttons / motion / ml)
  // funnels through here, so gameplay only ever receives 'action' and never learns the
  // source. See FrameworkInput.registerSource.
  function emitAction(payload) { if (game) game.send('action', payload || {}); }

  function injectScript(src) {
    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = src; s.onload = () => resolve(); s.onerror = () => resolve();   // tolerant: a missing hook file just means defaults
      document.head.appendChild(s);
    });
  }

  function resolveGid(explicit) {
    if (explicit) return explicit;
    const p = location.pathname.split('/');
    const i = p.indexOf('games');
    return (i !== -1 && p[i + 1]) ? p[i + 1] : 'fw';
  }

  // ── shell DOM ──────────────────────────────────────────────────────────────
  function shellHtml(title) {
    const hud = (cc.hud || []).map(h =>
      `<div class="fw-ctl-card"><div class="fw-ctl-lbl">${esc(h.label || h.key)}</div>
        <div class="fw-ctl-num" data-hud="${esc(h.key)}">0</div></div>`).join('');

    const groups = (cc.groups || []).map((g, gi) => {
      const opts = (g.options || []).map(o =>
        `<button class="fw-ctl-opt${o.default ? ' active' : ''}" data-group="${esc(g.key)}" data-opt="${esc(o.id)}">${esc(o.label != null ? o.label : o.id)}</button>`).join('');
      return `<div class="fw-ctl-grouplabel">${g.label ? esc(g.label) : ''}</div><div class="fw-ctl-group" data-gi="${gi}">${opts}</div>`;
    }).join('');

    const actions = (cc.actions || []).map(a =>
      `<button class="btn ${a.primary ? 'btn-primary fw-ctl-go' : 'btn-secondary'} fw-ctl-action" data-action="${esc(a.id)}">${esc(a.label != null ? a.label : a.id)}</button>`).join('');

    return `
      <div class="fw-ctl-top">
        <div class="fw-ctl-title" data-ctl-title>${esc(title)}</div>
        <div class="fw-ctl-status">
          <button class="pill fw-ctl-pause" data-ctl-pause aria-label="Pause">⏸</button>
          <span class="pill" data-ctl-conn>CONNECTING…</span>
        </div>
      </div>
      ${hud ? `<div class="fw-ctl-hud">${hud}</div>` : ''}
      <div class="fw-ctl-mid">
        <div class="fw-ctl-feedback" data-ctl-feedback></div>
        ${groups}
        <div class="fw-ctl-actions">${actions}</div>
      </div>
      ${cc.hint ? `<div class="fw-ctl-hint" data-ctl-hint>${esc(cc.hint)}</div>` : '<div class="fw-ctl-hint" data-ctl-hint></div>'}`;
  }

  // Minimal scoped styles (themed via tokens). Injected once; games can override by
  // shipping their own .fw-ctl-* rules after framework.css.
  function injectStyles() {
    if (document.getElementById('fw-ctl-style')) return;
    const s = document.createElement('style');
    s.id = 'fw-ctl-style';
    s.textContent = `
      body.fw-ctl-body { margin:0; height:100dvh; display:flex; flex-direction:column;
        padding:16px; box-sizing:border-box; touch-action:manipulation;
        background:radial-gradient(ellipse 90% 60% at 50% 100%, var(--game-accent-08), transparent 60%), var(--game-primary); }
      .fw-ctl-top { display:flex; justify-content:space-between; align-items:center;
        border-bottom:1.5px solid var(--game-border); padding-bottom:12px; }
      .fw-ctl-title { font-size:16px; font-weight:900; color:var(--game-accent); letter-spacing:-.01em; }
      .fw-ctl-status { display:flex; gap:8px; align-items:center; }
      .fw-ctl-pause { cursor:pointer; border:1.5px solid var(--fw-line-2); background:var(--game-surface-2);
        color:var(--game-text-2); font:inherit; }
      [data-ctl-conn] { border:1.5px solid var(--fw-line); background:var(--game-surface-2); color:var(--game-text-2); }
      .fw-ctl-hud { display:flex; gap:12px; margin:16px 0; }
      .fw-ctl-card { flex:1; background:var(--game-card-bg); border:1px solid rgba(255,255,255,.06);
        border-radius:var(--fw-r-3); padding:12px 10px; text-align:center;
        box-shadow:0 4px 14px rgba(0,0,0,.30), inset 0 1px 0 rgba(255,255,255,.03); }
      .fw-ctl-lbl { font-size:10px; text-transform:uppercase; color:var(--game-muted); letter-spacing:.14em; font-weight:700; }
      .fw-ctl-num { font-size:28px; font-weight:900; color:var(--game-gold); font-family:var(--game-mono); line-height:1.1; margin-top:4px; }
      .fw-ctl-mid { flex:1; display:flex; flex-direction:column; justify-content:center; gap:16px; }
      .fw-ctl-feedback:empty { display:none; }
      .fw-ctl-feedback { align-self:center; text-align:center; font-size:12px; font-weight:800; letter-spacing:.08em;
        text-transform:uppercase; color:var(--game-gold); padding:8px 16px; border-radius:99px;
        background:rgba(243,216,107,.10); border:1px solid rgba(243,216,107,.30); }
      .fw-ctl-grouplabel:empty { display:none; }
      .fw-ctl-grouplabel { font-size:11px; text-transform:uppercase; color:var(--game-muted); text-align:center; letter-spacing:.12em; font-weight:700; }
      .fw-ctl-group { display:flex; gap:10px; }
      .fw-ctl-opt { flex:1; background:var(--game-card-bg); border:1.5px solid rgba(255,255,255,.08);
        color:var(--game-text); padding:18px 12px; border-radius:16px; font-weight:800; font-size:14px;
        letter-spacing:.02em; font-family:inherit; cursor:pointer;
        box-shadow:0 4px 14px rgba(0,0,0,.30), inset 0 1px 0 rgba(255,255,255,.03);
        transition:border-color .15s, transform .1s, box-shadow .15s, color .15s, background .15s; }
      .fw-ctl-opt:active { transform:scale(.97); }
      .fw-ctl-opt.active { background:linear-gradient(180deg, var(--game-card-sel-top), var(--game-card-sel-btm));
        border-color:var(--game-accent); color:var(--game-accent);
        box-shadow:0 0 0 1px var(--game-accent-34), 0 8px 22px var(--game-secondary-28), inset 0 1px 0 rgba(255,255,255,.05); }
      .fw-ctl-actions { display:flex; flex-direction:column; gap:10px; }
      .fw-ctl-go { width:100%; height:68px; font-size:19px; font-weight:800; letter-spacing:.04em;
        border-radius:99px; color:var(--game-on-accent); background:var(--game-accent);
        box-shadow:0 4px 18px var(--game-accent-25), 0 8px 32px var(--game-accent-15); }
      .fw-ctl-go:active { transform:scale(.98); }
      .fw-ctl-hint { text-align:center; font-size:11px; color:var(--game-muted); margin-top:10px; min-height:14px; }`;
    document.head.appendChild(s);
  }

  // ── api passed to game hooks ────────────────────────────────────────────────
  function setHud(key, value) {
    const el = document.querySelector(`[data-hud="${CSS.escape ? CSS.escape(key) : key}"]`);
    if (el) el.textContent = (value == null ? 0 : value);
  }
  function defaultState(state) { (cc.hud || []).forEach(h => { if (state && h.key in state) setHud(h.key, state[h.key]); }); }
  function setStatus(text, color) {
    const e = document.querySelector('[data-ctl-conn]');
    if (e) { e.textContent = text; if (color) e.style.color = color; }
  }
  function setHint(text) { const e = document.querySelector('[data-ctl-hint]'); if (e) e.textContent = text || ''; }
  function setFeedback(text, color) { const e = document.querySelector('[data-ctl-feedback]'); if (e) { e.textContent = text || ''; if (color) e.style.color = color; } }
  function flash(opts) { if (T() && T().showMobileResult) T().showMobileResult(opts || {}); }
  function toLobby() { try { sessionStorage.removeItem(matchKey); } catch (_) {} location.href = `/games/${gid}/lobby.html`; }
  function toHome() { try { sessionStorage.removeItem(matchKey); } catch (_) {} location.href = `/games/${gid}/home.html`; }
  function startMatch(payload) {
    try { sessionStorage.setItem(matchKey, '1'); } catch (_) {}
    game.send('start', payload || {});
  }
  function matchEnd(opts) { if (T() && T().renderMobileMatchEnd) T().renderMobileMatchEnd(opts || {}); }

  function api() {
    return {
      game, config: cfg, controller: cc, params, sel,
      send: (type, payload) => game.send(type, payload),
      action: (payload) => game.send('action', payload || {}),
      setHud, applyState: defaultState, setStatus, setHint, setFeedback, flash,
      matchEnd, startMatch, toLobby, toHome,
      series: window.FrameworkSeries || null,
      text: (slot) => game.text(slot),
    };
  }

  // ── start payload resolution ────────────────────────────────────────────────
  function resolveStartPayload() {
    const sp = hooks && hooks.startPayload;
    if (typeof sp === 'function') return sp(params) || {};
    if (sp && typeof sp === 'object') return sp;
    // Default: forward known numeric URL params (target/overs/difficulty/attempts/rounds).
    const out = {};
    ['target', 'overs', 'attempts', 'rounds'].forEach(k => { const v = params.get(k); if (v != null) out[k] = isNaN(+v) ? v : +v; });
    const d = params.get('difficulty'); if (d) out.difficulty = d;
    return out;
  }

  // ── one-time pre-match tips ─────────────────────────────────────────────────
  function maybeTips() {
    if (!T() || !T().renderMobileTips) return;
    const slides = (hooks && hooks.tips)
      || (cc.tips)
      || (cfg.inMatch && cfg.inMatch.tips)
      || (cfg.ui && cfg.ui.onboarding && cfg.ui.onboarding.intro) || [];
    if (!slides.length) return;
    try { if (sessionStorage.getItem(tipsKey)) return; sessionStorage.setItem(tipsKey, '1'); } catch (_) {}
    T().renderMobileTips({ slides, startText: 'Got it' });
  }

  // ── wiring ──────────────────────────────────────────────────────────────────
  function wire(host) {
    // group selection
    host.querySelectorAll('.fw-ctl-group').forEach(g => {
      g.addEventListener('click', (e) => {
        const b = e.target.closest('.fw-ctl-opt'); if (!b) return;
        const key = b.getAttribute('data-group');
        sel[key] = b.getAttribute('data-opt');
        g.querySelectorAll('.fw-ctl-opt').forEach(x => x.classList.toggle('active', x === b));
      });
    });
    // actions
    host.querySelectorAll('.fw-ctl-action').forEach(b => {
      b.addEventListener('click', () => {
        if (navigator.vibrate) navigator.vibrate(25);
        const id = b.getAttribute('data-action');
        const act = (cc.actions || []).find(a => a.id === id) || {};
        if (hooks && typeof hooks.onAction === 'function') { hooks.onAction(id, Object.assign({}, sel), api()); return; }
        emitAction(Object.assign({}, sel, act.payload || {}));
      });
    });
    // pause → resume / quit
    const pause = host.querySelector('[data-ctl-pause]');
    if (pause) pause.onclick = () => {
      if (!T() || !T().renderMobilePause) return;
      T().renderMobilePause({
        title: 'Paused',
        onResume: () => {},
        onQuit: () => T().renderMobileQuitConfirm({ onQuit: toLobby }),
      });
    };
  }

  // ── default selections from config ──────────────────────────────────────────
  function seedSelections() {
    sel = {};
    (cc.groups || []).forEach(g => {
      const def = (g.options || []).find(o => o.default) || (g.options || [])[0];
      if (def) sel[g.key] = def.id;
    });
  }

  /**
   * Boot the controller. With no args it resolves everything from the URL + config.
   * @param {object} [opts] { gameId, role, config, controlsHtml, render, hooks }
   * @returns {Promise<object>} the FrameworkGame control api
   */
  async function mount(opts = {}) {
    gid = resolveGid(opts.gameId);
    matchKey = `${gid}_inmatch`;
    tipsKey = `${gid}_tips_seen`;
    params = new URLSearchParams(location.search);
    cfg = opts.config || await fetch(`/games/${gid}/game-config.json`).then(r => r.json()).catch(() => ({}));
    cc = cfg.controller || {};

    // Optional per-game controller logic (hooks) shipped separately from TV code:
    // `controller.code: ["gameplay/controller.js"]` defines window.Gameplay.controller.
    if (Array.isArray(cc.code)) {
      for (const rel of cc.code) await injectScript(`/games/${gid}/${rel}`);
    }
    hooks = opts.hooks || (window.Gameplay && window.Gameplay.controller) || {};

    if (window.FrameworkSeries) { try { window.FrameworkSeries.init(gid); } catch (_) {} }

    injectStyles();
    document.body.classList.add('fw-ctl-body');
    const host = document.getElementById('fw-ctl-root') || (() => { const d = document.createElement('div'); d.id = 'fw-ctl-root'; d.style.cssText = 'display:flex;flex-direction:column;flex:1;min-height:0;'; document.body.appendChild(d); return d; })();

    // Full custom shell override (Rec 7) — caller renders everything.
    if (typeof opts.render === 'function') {
      game = await bootGame(opts);
      opts.render({ host, api: api() });
      return game;
    }

    const title = (cfg.text && cfg.text.APP_TITLE) || gid;
    host.innerHTML = shellHtml(title);
    seedSelections();

    // Custom action-area DOM injection (keeps shell/pause/HUD).
    if (opts.controlsHtml) {
      const slot = host.querySelector('.fw-ctl-actions');
      if (slot) slot.innerHTML = opts.controlsHtml;
    }

    wire(host);
    game = await bootGame(opts);
    return game;
  }

  // Init FrameworkGame as a controller and wire lifecycle + match handlers.
  async function bootGame(opts) {
    const g = await window.FrameworkGame.init({
      role: opts.role || 'bat',
      onConnect: () => { setStatus('CONNECTED', 'var(--game-success)'); },
      onDisconnect: () => { setStatus('RECONNECTING…', 'var(--game-muted)'); },
      onPaired: () => onPaired(),
      handlers: {
        screen_rejoined: () => { if (resumeOnReconnect()) g.send('resume'); },
        handoff: (d) => { if (T() && T().renderMobileHandoff) T().renderMobileHandoff({ title: (d && d.title) || 'Pass the phone', next: d && d.next, seconds: (d && d.seconds) || 3 }); },
        game_state: (d) => onStateMsg(d),
        game_over: (d) => onOverMsg(d),
      },
    });
    game = g;
    const titleEl = document.querySelector('[data-ctl-title]');
    try { if (titleEl) titleEl.textContent = g.text('APP_TITLE') || titleEl.textContent; } catch (_) {}
    maybeStartSource();
    return g;
  }

  // Buttons are always live (the default source). If config asks for another input
  // (`input: 'motion'|'ml'`) AND a plugin registered it via FrameworkInput.registerSource,
  // start it; its emits funnel through emitAction exactly like a button tap.
  function maybeStartSource() {
    const name = cfg.input;
    if (!window.FrameworkInput || !window.FrameworkInput.hasSource(name)) return;
    try {
      const factory = window.FrameworkInput.getSource(name);
      activeSource = factory({ config: cfg, sel, game });
      if (activeSource && typeof activeSource.start === 'function') activeSource.start(emitAction);
      window.addEventListener('pagehide', () => { try { activeSource && activeSource.stop && activeSource.stop(); } catch (_) {} });
    } catch (e) { console.warn('[FrameworkController] input source "' + name + '" failed:', e); }
  }

  function resumeOnReconnect() { return !hooks || hooks.resumeOnReconnect !== false; }

  function onPaired() {
    // First pair = new match; reconnect with a live MATCH_KEY = resume.
    let live = false;
    try { live = !!sessionStorage.getItem(matchKey); } catch (_) {}
    if (live) { game.send('resume'); return; }
    if (typeof (hooks && hooks.start) === 'function') { hooks.start(api()); }
    else { startMatch(resolveStartPayload()); }
    maybeTips();
    started = true;
  }

  function onStateMsg(d) {
    if (hooks && typeof hooks.onState === 'function') hooks.onState(d, api());
    else defaultState(d);
  }

  function onOverMsg(d) {
    try { sessionStorage.removeItem(matchKey); } catch (_) {}
    if (hooks && typeof hooks.onOver === 'function') { hooks.onOver(d, api()); return; }
    // Generic default match-end card.
    const won = d && (d.won != null ? d.won : (d.score == null ? undefined : d.score > 0));
    matchEnd({
      won,
      title: won === false ? 'Game Over' : (won ? 'Victory' : 'Game Over'),
      winner: d && (d.winner != null ? d.winner : (d.score != null ? String(d.score) : '')),
      stats: (cc.hud || []).filter(h => d && h.key in d).map(h => ({ label: h.label || h.key, value: d[h.key] })),
      primaryText: 'Play Again', secondaryText: 'Home',
      onPrimary: () => startMatch(resolveStartPayload()),
      onSecondary: toHome,
    });
  }

  return { mount, api, get game() { return game; } };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.FrameworkController;
}
