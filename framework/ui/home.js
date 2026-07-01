'use strict';

/**
 * FrameworkHome — the framework-owned phone Home screen (the app's front door).
 *
 * Completes the documented flow: Splash → HOME → Pair → Lobby → … → Result → Home.
 * Renders a branded menu (title + logo + tappable cards) via the existing
 * FrameworkTemplates.renderMobileHome, then routes:
 *   Play         → lobby.html
 *   How to Play  → ui.help dialog
 *   About        → ui.about dialog
 *   Settings     → ui.settings sheet
 *
 * Items come from game-config.json `home: { items:[…], splash? }`. With no `home`
 * block, a sensible default menu is built from whatever the config already has
 * (Play always; How to Play / About / Settings when ui.help / ui.about / ui.settings
 * exist). Easy by default; override the list in config, or pass your own render.
 *
 * Stub home.html:
 *   await FrameworkHome.mount();
 *
 * window.FrameworkHome.
 */
window.FrameworkHome = (function () {
  const T = () => window.FrameworkTemplates;
  const U = () => window.FrameworkUI;

  function resolveGid(explicit) {
    if (explicit) return explicit;
    const p = location.pathname.split('/');
    const i = p.indexOf('games');
    return (i !== -1 && p[i + 1]) ? p[i + 1] : 'fw';
  }

  function infoDialog(cfg, which) {
    const info = (cfg.ui || {})[which];
    if (!info || !U() || !U().showConfirmDialog) return;
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
    U().showConfirmDialog({
      title: info.title || (which === 'help' ? 'How to Play' : 'About'),
      body: Array.isArray(info.body) ? info.body.map(p => `<p style="margin:0 0 10px;">${esc(p)}</p>`).join('') : esc(info.body || ''),
      confirmText: info.closeText || 'Close',
    });
  }

  function openSettings(cfg) {
    const items = (cfg.ui && cfg.ui.settings) || [];
    if (!T() || !T().renderMobileSettings || !items.length) return;
    T().renderMobileSettings({ title: 'Settings', items });
  }

  // Build the default item list from what the config already declares.
  function defaultItems(cfg, gid) {
    const items = [{ label: 'Play', sub: 'Pair your phone with the TV', icon: '🎮', action: 'play' }];
    if (cfg.ui && cfg.ui.help) items.push({ label: 'How to Play', sub: 'Quick guide', icon: '📖', action: 'help' });
    if (cfg.ui && cfg.ui.about) items.push({ label: 'About', sub: '', icon: 'ℹ️', action: 'about' });
    if (cfg.ui && cfg.ui.settings) items.push({ label: 'Settings', sub: '', icon: '⚙️', action: 'settings' });
    return items;
  }

  function handle(action, gid, cfg) {
    if (action === 'play' || !action) { location.href = `/games/${gid}/lobby.html`; return; }
    if (action === 'help') return infoDialog(cfg, 'help');
    if (action === 'about') return infoDialog(cfg, 'about');
    if (action === 'settings') return openSettings(cfg);
    if (typeof action === 'string' && /^https?:|^\//.test(action)) { location.href = action; return; }
  }

  // Optional lightweight splash: logo fade held briefly, then reveal the menu.
  function splash(logoUrl, title) {
    let o = document.getElementById('fw-home-splash');
    if (!o) { o = document.createElement('div'); o.id = 'fw-home-splash'; document.body.appendChild(o); }
    o.style.cssText = 'position:fixed;inset:0;z-index:9000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:var(--game-primary);transition:opacity .5s ease;';
    o.innerHTML = `${logoUrl ? `<img src="${logoUrl}" alt="" style="width:120px;height:120px;object-fit:contain;animation:fwLogoHeroIn .6s var(--fw-ease-out) both;">` : ''}
      <div style="font-size:26px;font-weight:900;color:var(--game-accent);letter-spacing:1px;animation:fwLogoHeroIn .7s var(--fw-ease-out) both;">${title || ''}</div>`;
    return () => { o.style.opacity = '0'; setTimeout(() => { o.style.display = 'none'; }, 520); };
  }

  /**
   * Render Home. With no args, resolves the game id + config from the URL.
   * @param {object} [opts] { gameId, config, render }
   */
  async function mount(opts = {}) {
    const gid = resolveGid(opts.gameId);
    const cfg = opts.config || await fetch(`/games/${gid}/game-config.json`).then(r => r.json()).catch(() => ({}));
    try { if (window.FrameworkTheme) await window.FrameworkTheme.load(gid); } catch (_) {}
    try { if (window.FrameworkAssets) await window.FrameworkAssets.loadConfig(gid); } catch (_) {}

    const title = (cfg.text && cfg.text.APP_TITLE) || gid;
    const subtitle = (cfg.text && cfg.text.APP_TAGLINE) || '';
    const logoUrl = (cfg.assets && cfg.assets.APP_LOGO) || '';

    document.body.style.background = 'var(--game-primary)';
    let host = document.getElementById('fw-home-root');
    if (!host) { host = document.createElement('div'); host.id = 'fw-home-root'; document.body.appendChild(host); }

    // Full custom override (Rec 7): caller renders everything.
    if (typeof opts.render === 'function') { opts.render({ host, config: cfg, gid }); return; }

    const homeCfg = cfg.home || {};
    const declared = Array.isArray(homeCfg.items) && homeCfg.items.length ? homeCfg.items : defaultItems(cfg, gid);
    const items = declared.map(it => ({
      label: it.label, sub: it.sub, icon: it.icon,
      onSelect: () => handle(it.action || it.href, gid, cfg),
    }));

    const paint = () => {
      if (T() && T().renderMobileHome) T().renderMobileHome(host, { title, subtitle, logoUrl, items });
    };

    const wantSplash = homeCfg.splash !== false && (homeCfg.splash === true || cfg.splash === true);
    if (wantSplash) {
      const dismiss = splash(logoUrl, title);
      paint();
      setTimeout(dismiss, 1200);
    } else {
      paint();
    }
  }

  return { mount };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.FrameworkHome;
}
