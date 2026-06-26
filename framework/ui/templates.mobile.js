'use strict';

/**
 * Mobile templates — phone-side screen shells, split out of templates.js for
 * maintainability. These augment the same window.FrameworkTemplates instance via
 * Object.assign, so the public API is unchanged (FrameworkTemplates.renderMobile*).
 * Load AFTER framework/ui/templates.js.
 */
(function () {
  if (typeof window === 'undefined' || !window.FrameworkTemplates) return;

  Object.assign(window.FrameworkTemplates, {
    /** Inject Mobile Lobby shell */
    renderMobileLobby(container, { gameTitle, subtitle, onStart, lobbyOptionsHtml }) {
      container.innerHTML = `
        <div style="padding: 20px; display: flex; flex-direction: column; height: 100dvh; justify-content: space-between;">
          <div style="text-align: center; margin-top: 16px;">
            <h1 style="font-size: 28px; font-weight: 900; color: var(--game-accent); margin-bottom: 4px;">${gameTitle}</h1>
            <p style="font-size: 13px; color: var(--game-muted);">${subtitle}</p>
          </div>
          <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 16px; margin: 20px 0;">
            ${lobbyOptionsHtml || `
              <div style="background: rgba(255, 255, 255, 0.05); padding: 16px; border-radius: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.08);">
                <div style="font-size: 14px; font-weight: 700; color: var(--game-text);">Controller Connected</div>
                <div style="font-size: 12px; color: var(--game-muted); margin-top: 4px;">Waiting for host to start...</div>
              </div>
            `}
          </div>
          <div style="margin-bottom: 16px; display: flex; flex-direction: column; gap: 10px;">
            <button class="btn btn-primary" id="fw-lobby-start" style="width: 100%;">${onStart ? 'START GAME' : 'WAITING FOR HOST'}</button>
          </div>
        </div>
      `;
      const startBtn = container.querySelector('#fw-lobby-start');
      if (onStart && startBtn) { startBtn.onclick = onStart; }
      else if (startBtn) { startBtn.disabled = true; startBtn.style.opacity = '0.5'; }
    },

    /** Inject Mobile Sensor Calibration / Stance screen */
    renderMobileCalibration(container, { title, instructions, onCalibrate }) {
      container.innerHTML = `
        <div style="padding: 24px; display: flex; flex-direction: column; height: 100dvh; justify-content: space-between; text-align: center;">
          <div style="margin-top: 24px;">
            <h2 style="font-size: 24px; font-weight: 900; color: var(--game-accent); margin-bottom: 8px;">${title || 'Stance Lock'}</h2>
            <p style="font-size: 14px; color: var(--game-muted); line-height: 1.5;">${instructions || 'Hold the device in your starting position and lock orientation.'}</p>
          </div>
          <div style="margin: 40px auto; width: 140px; height: 140px; border-radius: 50%; border: 3px dashed var(--game-accent); display: flex; align-items: center; justify-content: center; animation: spin 20s linear infinite;">
            <div style="font-size: 36px;">📱</div>
          </div>
          <div style="margin-bottom: 24px;">
            <button class="btn btn-primary" id="fw-calibrate-btn" style="width: 100%; font-size: 16px; padding: 14px;">SET MY POSITION</button>
          </div>
        </div>
      `;
      const calBtn = container.querySelector('#fw-calibrate-btn');
      if (calBtn) { calBtn.onclick = onCalibrate; }
    },

    /** Inject Mobile Active Play screen shell (HUD elements, active buttons) */
    renderMobileControllerHUD(container, { gameTitle, primaryStatLabel, secondaryStatLabel, customControlsHtml }) {
      container.innerHTML = `
        <div style="padding: 16px; display: flex; flex-direction: column; height: 100dvh; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px;">
            <div style="font-size: 16px; font-weight: 800; color: var(--game-accent);">${gameTitle}</div>
            <div style="display: flex; gap: 8px; font-size: 11px; align-items: center; background: rgba(255,255,255,0.08); padding: 4px 10px; border-radius: 20px;">
              <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--game-success);"></span>
              CONNECTED
            </div>
          </div>
          <div style="display: flex; gap: 12px; margin: 16px 0;">
            <div class="score-card" style="flex: 1; padding: 10px;">
              <div style="font-size: 11px; text-transform: uppercase; color: var(--game-muted);">${primaryStatLabel || 'Score'}</div>
              <div id="fw-hud-primary" class="score-num" style="font-size: 24px;">0</div>
            </div>
            <div class="score-card" style="flex: 1; padding: 10px;">
              <div style="font-size: 11px; text-transform: uppercase; color: var(--game-muted);">${secondaryStatLabel || 'Details'}</div>
              <div id="fw-hud-secondary" class="score-num" style="font-size: 24px; color: var(--game-text);">0</div>
            </div>
          </div>
          <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 16px;">
            ${customControlsHtml || `
              <div style="text-align: center; color: var(--game-muted); font-size: 14px;">
                Perform action on controller or tilt to play!
              </div>
            `}
          </div>
          <div style="display: flex; gap: 12px; margin-bottom: 12px;">
            <button class="btn btn-secondary" id="fw-ctrl-recal">RE-SET STANCE</button>
          </div>
        </div>
      `;
    },

    /** Mobile pause overlay — Resume / Quit. opts: { title, onResume, onQuit } */
    renderMobilePause({ title, onResume, onQuit } = {}) {
      let o = document.getElementById('fw-mobile-pause');
      if (!o) { o = document.createElement('div'); o.id = 'fw-mobile-pause'; o.className = 'dialog-overlay'; document.body.appendChild(o); }
      o.innerHTML = `<div class="dialog-card"><div class="dialog-title">${title || 'Paused'}</div>
        <div class="dialog-btns"><button class="btn btn-secondary" id="fw-pause-quit">Quit</button>
        <button class="btn btn-primary" id="fw-pause-resume">Resume</button></div></div>`;
      o.classList.add('show');
      const r = o.querySelector('#fw-pause-resume'), q = o.querySelector('#fw-pause-quit');
      if (r) r.onclick = () => { this.hideMobilePause(); if (onResume) onResume(); };
      if (q) q.onclick = () => { this.hideMobilePause(); if (onQuit) onQuit(); };
    },
    hideMobilePause() { const o = document.getElementById('fw-mobile-pause'); if (o) o.classList.remove('show'); },

    /**
     * Mobile home menu — title + logo + tappable cards. Sport-neutral.
     * opts: { title, subtitle, logoUrl, items:[{ label, sub, icon, onSelect }] }
     */
    renderMobileHome(container, { title, subtitle, logoUrl, items = [] } = {}) {
      const el = typeof container === 'string' ? document.getElementById(container) : container;
      if (!el) return;
      el.innerHTML = `<div style="padding:24px 18px;display:flex;flex-direction:column;min-height:100dvh;">
        <div style="text-align:center;margin:18px 0 22px;">
          ${logoUrl ? `<img src="${logoUrl}" style="width:88px;height:88px;object-fit:contain;">` : ''}
          <h1 style="font-size:30px;font-weight:900;color:var(--game-accent);margin-top:10px;">${title || ''}</h1>
          ${subtitle ? `<p style="font-size:13px;color:var(--game-muted);margin-top:4px;">${subtitle}</p>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          ${items.map((it, i) => `<button class="card" data-i="${i}" style="display:flex;align-items:center;gap:14px;text-align:left;cursor:pointer;color:var(--game-text);font-family:inherit;">
            ${it.icon ? `<span style="font-size:26px;">${it.icon}</span>` : ''}
            <span style="flex:1;"><span style="display:block;font-size:17px;font-weight:800;">${it.label}</span>
            ${it.sub ? `<span style="font-size:12px;color:var(--game-muted);">${it.sub}</span>` : ''}</span>
            <span style="color:var(--game-muted);font-size:22px;">›</span></button>`).join('')}
        </div></div>`;
      el.querySelectorAll('button[data-i]').forEach(b => { b.onclick = () => { const it = items[+b.getAttribute('data-i')]; if (it && it.onSelect) it.onSelect(); }; });
    },

    /**
     * Mobile settings overlay — toggle rows + action rows. Sport-neutral.
     * opts: { title, items:[{ label, type:'toggle'|'button', value, action, onChange }], onClose }
     */
    renderMobileSettings({ title, items = [], onClose } = {}) {
      let o = document.getElementById('fw-mobile-settings');
      if (!o) { o = document.createElement('div'); o.id = 'fw-mobile-settings'; o.className = 'dialog-overlay'; document.body.appendChild(o); }
      o.innerHTML = `<div class="dialog-card" style="max-width:360px;">
        <div class="dialog-title">${title || 'Settings'}</div>
        <div style="display:flex;flex-direction:column;gap:10px;margin:16px 0;text-align:left;">
          ${items.map((it, i) => `<div data-i="${i}" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;background:rgba(255,255,255,.05);border:1px solid var(--fw-line);border-radius:var(--fw-r-2);">
            <span style="font-size:14px;font-weight:700;color:var(--game-text);">${it.label}</span>
            ${it.type === 'toggle'
              ? `<span style="width:46px;height:26px;border-radius:99px;background:${it.value ? 'var(--game-accent)' : 'rgba(255,255,255,.15)'};position:relative;transition:background .15s;"><span style="position:absolute;top:3px;left:${it.value ? '23px' : '3px'};width:20px;height:20px;border-radius:50%;background:#fff;transition:left .15s;"></span></span>`
              : `<button class="btn btn-secondary" style="flex:0 0 auto;min-height:0;padding:8px 14px;font-size:12px;">${it.action || 'Open'}</button>`}
          </div>`).join('')}
        </div>
        <button class="btn btn-primary" id="fw-set-close">Done</button></div>`;
      o.classList.add('show');
      items.forEach((it, i) => {
        const row = o.querySelector(`[data-i="${i}"]`); if (!row) return;
        if (it.type === 'toggle') { row.onclick = () => { it.value = !it.value; if (it.onChange) it.onChange(it.value); this.renderMobileSettings({ title, items, onClose }); }; }
        else { const btn = row.querySelector('button'); if (btn) btn.onclick = () => { if (it.onChange) it.onChange(); }; }
      });
      const c = o.querySelector('#fw-set-close'); if (c) c.onclick = () => { this.hideMobileSettings(); if (onClose) onClose(); };
    },
    hideMobileSettings() { const o = document.getElementById('fw-mobile-settings'); if (o) o.classList.remove('show'); },
  });
})();
