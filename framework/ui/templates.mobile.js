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

    /**
     * Mobile in-match tips carousel — coach cards before the first action. Optional.
     * opts: { slides:[{icon,title,text}], onDone, startText? }
     */
    renderMobileTips({ slides = [], onDone, startText } = {}) {
      if (!slides.length) { if (onDone) onDone(); return; }
      let o = document.getElementById('fw-mobile-tips');
      if (!o) { o = document.createElement('div'); o.id = 'fw-mobile-tips'; o.className = 'dialog-overlay'; document.body.appendChild(o); }
      let idx = 0;
      const dotsFn = (window.FrameworkUI && window.FrameworkUI.dots) ? window.FrameworkUI.dots : () => '';
      const paint = () => {
        const s = slides[idx];
        o.innerHTML = `<div class="dialog-card" style="max-width:360px;">
          ${s.icon ? `<div style="font-size:44px;margin-bottom:8px;">${s.icon}</div>` : ''}
          <div class="dialog-title">${s.title || 'Tip'}</div>
          <div class="dialog-body">${s.text || ''}</div>
          <div style="display:flex;justify-content:center;margin-bottom:14px;">${dotsFn(slides.length, idx)}</div>
          <div class="dialog-btns">
            <button class="btn btn-secondary" id="fw-tips-skip">Skip</button>
            <button class="btn btn-primary" id="fw-tips-next">${idx >= slides.length - 1 ? (startText || 'Play') : 'Next'}</button>
          </div></div>`;
        const done = () => { o.classList.remove('show'); if (onDone) onDone(); };
        o.querySelector('#fw-tips-skip').onclick = done;
        o.querySelector('#fw-tips-next').onclick = () => { if (idx >= slides.length - 1) done(); else { idx++; paint(); } };
      };
      paint();
      o.classList.add('show');
    },

    /** Mobile center result flash (SIX!, GOAL!, OUT!). Auto-fades. opts:{text,sub,color}. */
    showMobileResult({ text, sub, color } = {}) {
      let o = document.getElementById('fw-mobile-flash');
      if (!o) {
        o = document.createElement('div');
        o.id = 'fw-mobile-flash';
        o.style.cssText = 'position:fixed;left:50%;top:42%;transform:translate(-50%,-50%);z-index:9000;pointer-events:none;text-align:center;opacity:0;transition:opacity .2s,transform .2s;';
        document.body.appendChild(o);
      }
      o.innerHTML = `<div style="font-size:64px;font-weight:900;color:${color || 'var(--game-gold)'};text-shadow:0 6px 24px rgba(0,0,0,.6);">${text || ''}</div>${sub ? `<div style="font-size:18px;font-weight:700;color:var(--game-text);margin-top:4px;">${sub}</div>` : ''}`;
      o.style.opacity = '1'; o.style.transform = 'translate(-50%,-50%) scale(1.1)';
      clearTimeout(this._flashTimer);
      this._flashTimer = setTimeout(() => { o.style.opacity = '0'; o.style.transform = 'translate(-50%,-50%) scale(.9)'; }, 1100);
    },

    /**
     * Mobile handoff overlay — "pass the phone" with a countdown. Optional (e.g. a
     * new batter / next player takes the controller). opts:{ title, next, seconds, onReady }
     */
    renderMobileHandoff({ title, next, seconds = 3, onReady } = {}) {
      let o = document.getElementById('fw-mobile-handoff');
      if (!o) { o = document.createElement('div'); o.id = 'fw-mobile-handoff'; o.className = 'dialog-overlay'; document.body.appendChild(o); }
      let n = seconds;
      const paint = () => {
        o.innerHTML = `<div class="dialog-card"><div style="font-size:40px;">🤝</div>
          <div class="dialog-title">${title || 'Pass the phone'}</div>
          ${next ? `<div class="dialog-body">Next: <b style="color:var(--game-text);">${next}</b></div>` : ''}
          <div style="font-family:var(--game-mono);font-size:56px;font-weight:900;color:var(--game-accent);">${n > 0 ? n : 'GO'}</div>
          <button class="btn btn-primary" id="fw-handoff-ready" style="margin-top:8px;">I'm Ready</button></div>`;
        o.querySelector('#fw-handoff-ready').onclick = finish;
      };
      const finish = () => { clearInterval(this._handoffTimer); o.classList.remove('show'); if (onReady) onReady(); };
      paint(); o.classList.add('show');
      this._handoffTimer = setInterval(() => { n--; if (n < 0) { finish(); return; } paint(); }, 1000);
    },

    /**
     * Mobile "TV away" overlay — the big screen dropped mid-match; passive, auto-resumes.
     * Phone-side twin of renderTVAway. opts: { message }
     */
    renderMobileAway({ message } = {}) {
      let o = document.getElementById('fw-mobile-away');
      if (!o) {
        o = document.createElement('div');
        o.id = 'fw-mobile-away';
        o.style.cssText = 'position:fixed;inset:0;z-index:9550;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:30px;background:rgba(5,10,22,.96);';
        document.body.appendChild(o);
      }
      o.innerHTML = `<div style="font-size:60px;">📺</div>
        <div style="font-size:20px;font-weight:800;color:var(--game-gold);">${message || 'TV disconnected'}</div>
        <div style="font-size:14px;color:var(--game-muted);max-width:300px;">Reconnecting to the big screen — your match resumes automatically.</div>
        <div style="font-size:28px;letter-spacing:6px;color:var(--game-muted);animation:fwBlink 1.2s infinite;">• • •</div>
        <style>@keyframes fwBlink{0%,100%{opacity:.3}50%{opacity:1}}</style>`;
      o.style.display = 'flex';
    },
    hideMobileAway() { const o = document.getElementById('fw-mobile-away'); if (o) o.style.display = 'none'; },

    /**
     * Rich phone match-end card (CricSwing-style) — icon, result, stat tiles, series
     * dots, quote, and up to two buttons. Phone twin of renderTVResult. opts:
     *   { won, icon, title, sub, winner, stats:[{label,value}], scoreboard:{user,opp},
     *     quote:{text,by}, series (FrameworkSeries.standings()), primaryText, onPrimary,
     *     secondaryText, onSecondary }
     */
    renderMobileMatchEnd(opts = {}) {
      const esc = (v) => String(v == null ? '' : v).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
      let o = document.getElementById('fw-mobile-matchend');
      if (!o) {
        o = document.createElement('div');
        o.id = 'fw-mobile-matchend';
        o.style.cssText = 'position:fixed;inset:0;z-index:9600;overflow-y:auto;background:radial-gradient(ellipse at 50% 0%, var(--game-accent-08), var(--game-primary) 70%), var(--game-primary);';
        document.body.appendChild(o);
      }
      const loss = opts.won === false;
      const icon = opts.icon != null ? opts.icon : (loss ? '🥀' : '🏆');
      const stats = (opts.stats || []).map(s => `
        <div style="background:rgba(255,255,255,.04);border:1px solid var(--fw-line);border-radius:11px;padding:12px 6px;text-align:center;">
          <div style="font-family:var(--game-mono);font-size:24px;font-weight:900;color:var(--game-gold);line-height:1;">${esc(s.value)}</div>
          <div style="font-size:10px;color:var(--game-muted);text-transform:uppercase;letter-spacing:.12em;margin-top:6px;font-weight:700;">${esc(s.label)}</div>
        </div>`).join('');
      const card = (t) => t ? `
        <div style="flex:1;background:rgba(255,255,255,.04);border:2px solid ${t.winner ? 'var(--game-gold)' : 'var(--fw-line)'};border-radius:14px;padding:12px;text-align:center;">
          <div style="font-size:14px;font-weight:800;color:var(--game-text);">${esc(t.name || '')}</div>
          <div style="font-family:var(--game-mono);font-size:28px;font-weight:900;color:${t.winner ? 'var(--game-gold)' : 'var(--game-text)'};margin-top:4px;">${esc(t.score != null ? t.score : '')}</div>
        </div>` : '';
      const sb = opts.scoreboard
        ? `<div style="display:flex;gap:10px;">${card(opts.scoreboard.user)}${card(opts.scoreboard.opp)}</div>` : '';
      const dots = (opts.series && this._seriesDots) ? this._seriesDots(opts.series) : '';
      const seriesLabel = opts.series
        ? `<div style="text-align:center;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--game-accent);">${esc(opts.series.label || '')}</div>` : '';
      const quote = opts.quote
        ? `<div style="text-align:center;padding:10px 16px;background:rgba(255,255,255,.03);border-radius:12px;"><span style="font-style:italic;font-size:14px;color:var(--game-offwhite,#F5F7EF);">“${esc(opts.quote.text)}”</span>${opts.quote.by ? `<div style="font-size:12px;color:var(--game-gold);margin-top:6px;font-weight:700;">— ${esc(opts.quote.by)}</div>` : ''}</div>` : '';
      o.innerHTML = `
        <div style="min-height:100dvh;display:flex;flex-direction:column;gap:14px;padding:28px 18px;box-sizing:border-box;justify-content:center;">
          <div style="text-align:center;">
            <div style="font-size:56px;line-height:1;">${icon}</div>
            <div style="font-size:30px;font-weight:900;letter-spacing:1px;text-transform:uppercase;color:${loss ? 'var(--game-danger)' : 'var(--game-gold)'};margin-top:6px;">${esc(opts.title || (loss ? 'Defeat' : 'Victory'))}</div>
            ${opts.sub ? `<div style="font-size:14px;color:var(--game-muted);margin-top:6px;">${esc(opts.sub)}</div>` : ''}
            ${opts.winner ? `<div style="font-family:var(--game-mono);font-size:34px;font-weight:900;color:var(--game-text);margin-top:8px;">${esc(opts.winner)}</div>` : ''}
          </div>
          ${stats ? `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">${stats}</div>` : ''}
          ${sb}
          ${seriesLabel}
          ${dots}
          ${quote}
          <div style="display:flex;flex-direction:column;gap:10px;margin-top:6px;">
            ${opts.primaryText ? `<button class="btn btn-primary fw-full" id="fw-me-primary" style="font-size:17px;padding:15px;">${esc(opts.primaryText)}</button>` : ''}
            ${opts.secondaryText ? `<button class="btn btn-secondary fw-full" id="fw-me-secondary" style="font-size:16px;padding:14px;">${esc(opts.secondaryText)}</button>` : ''}
          </div>
        </div>`;
      o.style.display = 'block';
      const p = o.querySelector('#fw-me-primary'), s = o.querySelector('#fw-me-secondary');
      if (p) p.onclick = () => { this.hideMobileMatchEnd(); if (opts.onPrimary) opts.onPrimary(); };
      if (s) s.onclick = () => { this.hideMobileMatchEnd(); if (opts.onSecondary) opts.onSecondary(); };
    },
    hideMobileMatchEnd() { const o = document.getElementById('fw-mobile-matchend'); if (o) o.style.display = 'none'; },

    /** Mobile quit-confirm — reuse the confirm dialog with match-exit wording. */
    renderMobileQuitConfirm({ title, body, onQuit, onStay } = {}) {
      if (!window.FrameworkUI || !window.FrameworkUI.showConfirmDialog) { if (onQuit) onQuit(); return; }
      window.FrameworkUI.showConfirmDialog({
        title: title || 'Exit this match?',
        body: body || 'Your progress in this match will be lost.',
        confirmText: 'Exit', cancelText: 'Keep Playing',
        onConfirm: () => { if (onQuit) onQuit(); },
        onCancel: () => { if (onStay) onStay(); },
      });
    },

    /**
     * Editable roster / batting order — inline list of name inputs. Optional;
     * used by the lobby `target` step when a game supplies `roster`. Sport-neutral.
     * opts: { title, names:[...], onChange(list) }
     */
    renderMobileTeamEdit(container, { title, names = [], roles = [], onChange } = {}) {
      const el = typeof container === 'string' ? document.getElementById(container) : container;
      if (!el) return;
      const esc = (v) => String(v == null ? '' : v).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
      el.innerHTML = `<div class="fw-roster-card">
        ${title ? `<div class="fw-roster-title">${esc(title)}</div>` : ''}
        ${names.map((n, i) => `<div class="fw-roster-row${i === 0 ? ' next' : ''}">
          <span class="fw-roster-num">${i === 0 ? '🏏' : (i + 1)}</span>
          <input class="fw-roster-input" data-i="${i}" maxlength="20" value="${esc(n)}">
          ${roles[i] ? `<span class="fw-roster-role">${esc(roles[i])}</span>` : ''}
        </div>`).join('')}
      </div>`;
      el.querySelectorAll('.fw-roster-input').forEach(inp => {
        inp.oninput = () => {
          const list = Array.from(el.querySelectorAll('.fw-roster-input')).map(x => x.value);
          if (onChange) onChange(list);
        };
      });
    },

    // ══ OPTIONAL motion/swing phone screens (gated; only when input:'motion') ══════
    // Sport-neutral. Reused by Baseball (pitch/timing) + a future cricket swing mode.

    /** Camera-orientation hint before a motion match. opts:{ title, body, onAck } */
    renderMobileCameraHint({ title, body, onAck } = {}) {
      let o = document.getElementById('fw-mobile-camhint');
      if (!o) { o = document.createElement('div'); o.id = 'fw-mobile-camhint'; o.style.cssText = 'position:fixed;inset:0;z-index:9500;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center;padding:30px;background:#060d1a;'; document.body.appendChild(o); }
      o.innerHTML = `<div style="font-size:64px;">📷</div>
        <div style="font-size:22px;font-weight:900;color:var(--game-accent);">${title || 'Point the camera at the TV'}</div>
        <div style="font-size:14px;color:var(--game-muted);max-width:300px;line-height:1.5;">${body || 'Keep the rear camera facing the screen so your motion lines up with the action.'}</div>
        <button class="btn btn-primary fw-full" id="fw-camhint-ok" style="max-width:300px;margin-top:8px;">Got it</button>`;
      o.style.display = 'flex';
      const b = o.querySelector('#fw-camhint-ok'); if (b) b.onclick = () => { this.hideMobileCameraHint(); if (onAck) onAck(); };
    },
    hideMobileCameraHint() { const o = document.getElementById('fw-mobile-camhint'); if (o) o.style.display = 'none'; },

    /**
     * Stance lock — bat/stance art + a hold bar + LOCK button. Richer than
     * renderMobileCalibration. opts:{ title, art, holdPct, onLock }. Drive the bar
     * with updateMobileStance(pct); enable LOCK when ready.
     */
    renderMobileStance({ title, art, holdPct = 0, onLock } = {}) {
      let o = document.getElementById('fw-mobile-stance');
      if (!o) { o = document.createElement('div'); o.id = 'fw-mobile-stance'; o.style.cssText = 'position:fixed;inset:0;z-index:9500;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:30px;background:#060d1a;'; document.body.appendChild(o); }
      o.innerHTML = `<div style="font-size:84px;line-height:1;">${art || '🏏'}</div>
        <div style="font-size:20px;font-weight:900;color:var(--game-text);">${title || 'Hold your stance'}</div>
        <div style="width:100%;max-width:300px;height:8px;border-radius:8px;background:rgba(255,255,255,.08);overflow:hidden;">
          <div id="fw-stance-bar" style="height:100%;width:${Math.max(0, Math.min(100, holdPct))}%;background:var(--game-accent);transition:width .15s;"></div>
        </div>
        <div id="fw-stance-msg" style="font-size:13px;color:var(--game-muted);">Hold steady…</div>
        <button class="btn btn-primary fw-full" id="fw-stance-lock" style="max-width:300px;margin-top:6px;" disabled>LOCK STANCE</button>`;
      o.style.display = 'flex';
      const b = o.querySelector('#fw-stance-lock'); if (b) b.onclick = () => { this.hideMobileStance(); if (onLock) onLock(); };
    },
    updateMobileStance(pct, ready) {
      const bar = document.getElementById('fw-stance-bar'); if (bar) bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
      const lock = document.getElementById('fw-stance-lock'); if (lock) lock.disabled = !ready;
      const msg = document.getElementById('fw-stance-msg'); if (msg && ready) { msg.textContent = '✓ Stance good — tap LOCK'; msg.style.color = 'var(--game-accent)'; }
    },
    hideMobileStance() { const o = document.getElementById('fw-mobile-stance'); if (o) o.style.display = 'none'; },

    /**
     * Bowl / pitch control — big seam button + timing bar + status line. Sport-neutral
     * (cricket "BOWL" / baseball "PITCH"). opts:{ label, hint, onFire }. Drive the bar
     * with updateMobilePitchTiming(pct); set status with setMobilePitchStatus(text).
     */
    renderMobilePitchControl({ label, hint, onFire } = {}) {
      let o = document.getElementById('fw-mobile-pitch');
      if (!o) { o = document.createElement('div'); o.id = 'fw-mobile-pitch'; o.style.cssText = 'position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:14px;padding:30px;box-sizing:border-box;background:#000;'; document.body.appendChild(o); }
      o.innerHTML = `
        <div id="fw-pitch-status" style="font-size:15px;font-weight:800;color:var(--game-gold);background:rgba(255,255,255,.05);border:1px solid var(--fw-line);border-radius:99px;padding:8px 18px;">Awaiting delivery</div>
        <div style="width:100%;max-width:320px;height:7px;border-radius:7px;background:rgba(255,255,255,.08);overflow:hidden;">
          <div id="fw-pitch-bar" style="height:100%;width:0%;background:var(--game-danger);transition:width .05s linear;"></div>
        </div>
        <button id="fw-pitch-fire" style="width:120px;height:120px;border-radius:50%;border:3px solid #ff5050;cursor:pointer;
          background:radial-gradient(circle at 40% 35%, #f05050, #7a0000);color:#fff;font-size:24px;font-weight:900;letter-spacing:1px;
          box-shadow:0 0 28px rgba(255,40,40,.4), inset 0 4px 10px rgba(255,255,255,.25);">${label || 'BOWL'}</button>
        ${hint ? `<div style="font-size:11px;color:var(--game-muted);">${hint}</div>` : ''}`;
      o.style.display = 'flex';
      const f = o.querySelector('#fw-pitch-fire');
      if (f) f.onclick = () => { if (navigator.vibrate) navigator.vibrate(30); if (onFire) onFire(); };
    },
    updateMobilePitchTiming(pct) { const b = document.getElementById('fw-pitch-bar'); if (b) b.style.width = Math.max(0, Math.min(100, pct)) + '%'; },
    setMobilePitchStatus(text) { const s = document.getElementById('fw-pitch-status'); if (s) s.textContent = text; },
    hideMobilePitchControl() { const o = document.getElementById('fw-mobile-pitch'); if (o) o.style.display = 'none'; },

    /**
     * Training hub — list of shots with ★/☆ trained state + "Train all". Optional
     * (per-player ML). opts:{ title, subtitle, shots:[{name,trained}], onPick, onAll }
     */
    renderMobileTrainingHub({ title, subtitle, shots = [], onPick, onAll } = {}) {
      const esc = (v) => String(v == null ? '' : v).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
      let o = document.getElementById('fw-mobile-train');
      if (!o) { o = document.createElement('div'); o.id = 'fw-mobile-train'; o.style.cssText = 'position:fixed;inset:0;z-index:9500;overflow-y:auto;background:#060d1a;'; document.body.appendChild(o); }
      o.innerHTML = `<div style="padding:28px 18px;display:flex;flex-direction:column;gap:12px;min-height:100dvh;box-sizing:border-box;">
        <div style="text-align:center;margin-bottom:8px;">
          <h1 style="font-size:26px;font-weight:900;color:var(--game-accent);margin:0;">${esc(title || 'Train Your Shots')}</h1>
          ${subtitle ? `<p style="font-size:12px;color:var(--game-muted);margin-top:4px;">${esc(subtitle)}</p>` : ''}</div>
        ${shots.map((s, i) => `<button class="card" data-i="${i}" style="display:flex;align-items:center;gap:12px;text-align:left;cursor:pointer;color:var(--game-text);font-family:inherit;">
          <span style="font-size:20px;color:${s.trained ? 'var(--game-accent)' : 'var(--game-gold)'};">${s.trained ? '★' : '☆'}</span>
          <span style="flex:1;font-size:15px;font-weight:800;">${esc(s.name)}</span>
          <span style="font-size:12px;color:var(--game-muted);">${s.trained ? 'Trained' : 'Train ›'}</span></button>`).join('')}
        <div style="flex:1;"></div>
        <button class="btn btn-primary fw-full" id="fw-train-all" style="font-size:16px;padding:14px;">Train All</button>
      </div>`;
      o.style.display = 'block';
      o.querySelectorAll('button[data-i]').forEach(b => { b.onclick = () => { const s = shots[+b.getAttribute('data-i')]; if (onPick) onPick(s, +b.getAttribute('data-i')); }; });
      const all = o.querySelector('#fw-train-all'); if (all) all.onclick = () => { if (onAll) onAll(); };
    },
    hideMobileTrainingHub() { const o = document.getElementById('fw-mobile-train'); if (o) o.style.display = 'none'; },
  });
})();
