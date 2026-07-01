'use strict';

/**
 * Pre-built screen layout templates for TV and Mobile.
 * Minimizes HTML boilerplates in game extensions.
 */
class GameTemplates {
  // Mobile screen shells live in framework/ui/templates.mobile.js (augment this
  // instance via Object.assign): renderMobileLobby / renderMobileCalibration /
  // renderMobileControllerHUD / renderMobileHome / renderMobilePause / renderMobileSettings.

  /**
   * Inject TV Gameplay overlay HUD (top status, bottom feed)
   */
  renderTVHUD(container, { gameTitle, primaryLabel, secondaryLabel }) {
    container.innerHTML = `
      <div style="position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; padding: 32px; z-index: 10;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
          <div style="background: rgba(10, 20, 30, 0.85); border: 2.5px solid var(--game-accent); border-radius: 16px; padding: 16px 24px; pointer-events: auto; backdrop-filter: blur(10px); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <div style="font-size: 12px; font-weight: 800; letter-spacing: 1px; color: var(--game-muted); text-transform: uppercase; margin-bottom: 4px;">
              ${gameTitle}
            </div>
            <div style="display: flex; gap: 24px; align-items: center;">
              <div>
                <span style="font-size: 13px; color: var(--game-muted); text-transform: uppercase;">${primaryLabel || 'Points'}</span>
                <div id="fw-tv-primary" style="font-size: 36px; font-weight: 900; color: var(--game-accent); line-height: 1;">0</div>
              </div>
              <div style="width: 1px; height: 32px; background: rgba(255,255,255,0.15);"></div>
              <div>
                <span style="font-size: 13px; color: var(--game-muted); text-transform: uppercase;">${secondaryLabel || 'Record'}</span>
                <div id="fw-tv-secondary" style="font-size: 36px; font-weight: 900; color: var(--game-text); line-height: 1;">0</div>
              </div>
            </div>
          </div>

          <div style="background: rgba(10, 20, 30, 0.85); border: 1.5px solid rgba(255, 255, 255, 0.15); border-radius: 12px; padding: 10px 16px; pointer-events: auto; backdrop-filter: blur(8px); font-size: 14px; display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--game-success); animation: flash 1s infinite alternate;"></span>
            <span id="fw-tv-status">Active Session</span>
          </div>
        </div>

        <div style="width: 100%; max-width: 450px; background: rgba(10, 20, 30, 0.85); border-radius: 12px; border: 1.5px solid rgba(255, 255, 255, 0.1); padding: 16px; pointer-events: auto; backdrop-filter: blur(8px); display: flex; flex-direction: column; gap: 6px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <div style="font-size: 11px; font-weight: 800; color: var(--game-muted); text-transform: uppercase; letter-spacing: 0.5px;">Live Feed</div>
          <div id="fw-tv-feed" style="font-size: 14px; font-weight: 700; color: var(--game-text); height: 40px; display: flex; align-items: center;">
            Waiting for first play...
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Broadcast-style TV scorebar — a top score chip + a bottom "lower third" bar
   * (chasing line, target, runs needed, run rate, over). Modelled on CricSwing's
   * TV HUD but driven entirely by updateTVScorebar(state); appended to <body> so
   * screen.html stays thin. Hidden until shown.
   */
  renderTVScorebar({ title, chasingLabel } = {}) {
    this.hideTVSetup();   // gameplay started → dismiss the lobby mirror
    let o = document.getElementById('fw-tv-scorebar');
    if (!o) {
      o = document.createElement('div');
      o.id = 'fw-tv-scorebar';
      o.style.cssText = 'position:fixed;inset:0;z-index:20;pointer-events:none;display:none;';
      document.body.appendChild(o);
    }
    const HB = 'background:var(--game-surface);border:1.5px solid var(--game-secondary-30);backdrop-filter:blur(8px);box-shadow:var(--fw-shadow-card);border-radius:12px;';
    const SCORE = 'font-family:var(--game-mono);font-weight:900;color:var(--game-gold);line-height:1;text-shadow:0 0 .35em rgba(243,216,107,.45);';
    o.innerHTML = `
      <div style="position:absolute;top:28px;left:28px;${HB}padding:8px 16px;">
        <div style="font-size:12px;font-weight:800;letter-spacing:1px;color:var(--game-muted);text-transform:uppercase;">${title || ''}</div>
        <div style="display:flex;align-items:baseline;gap:10px;margin-top:2px;">
          <div id="fw-sb-score" style="${SCORE}font-size:34px;">0</div>
          <div id="fw-sb-over" style="font-family:var(--game-mono);font-size:19px;font-weight:800;color:var(--game-accent);">0.0</div>
        </div>
      </div>
      <div style="position:absolute;left:50%;bottom:30px;transform:translateX(-50%);display:flex;gap:0;${HB}overflow:hidden;">
        <div style="padding:12px 22px;">
          <div style="font-size:11px;text-transform:uppercase;color:var(--game-muted);letter-spacing:1px;">${chasingLabel || 'Target'}</div>
          <div id="fw-sb-target" style="font-family:var(--game-mono);font-size:22px;font-weight:900;color:var(--game-text);">—</div>
        </div>
        <div style="padding:12px 22px;border-left:1px solid var(--fw-line);">
          <div style="font-size:11px;text-transform:uppercase;color:var(--game-muted);letter-spacing:1px;">Need</div>
          <div id="fw-sb-need" style="font-family:var(--game-mono);font-size:18px;font-weight:900;color:var(--game-gold);">—</div>
        </div>
        <div style="padding:12px 22px;border-left:1px solid var(--fw-line);">
          <div style="font-size:11px;text-transform:uppercase;color:var(--game-muted);letter-spacing:1px;">Run Rate</div>
          <div id="fw-sb-rate" style="font-family:var(--game-mono);font-size:22px;font-weight:900;color:var(--game-text);">0.0</div>
        </div>
      </div>`;
    o.style.display = 'block';
  }

  /** Update the scorebar from game state. state: { runs, balls, overs, target } */
  updateTVScorebar(state = {}) {
    const runs = state.runs || 0;
    const balls = state.balls || 0;
    const overs = state.overs || 0;
    const target = state.target || 0;
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    set('fw-sb-score', runs);
    set('fw-sb-over', `${Math.floor(balls / 6)}.${balls % 6}`);
    set('fw-sb-target', target ? target : '—');
    const ballsLeft = Math.max(0, overs * 6 - balls);
    const need = Math.max(0, target - runs);
    set('fw-sb-need', target ? (need <= 0 ? 'WON' : `${need} off ${ballsLeft}`) : '—');
    const crr = balls > 0 ? (runs / (balls / 6)) : 0;
    set('fw-sb-rate', crr.toFixed(1));
  }

  hideTVScorebar() {
    const o = document.getElementById('fw-tv-scorebar');
    if (o) o.style.display = 'none';
  }

  // ── HUD archetypes ────────────────────────────────────────────────────────
  // Pick one with renderScorebar(kind, opts) / updateScorebar(kind, state).
  //   'chase'   — runs · target · need · rate            (chase/target sports)
  //   'versus'  — scoreA | round/clock | scoreB          (head-to-head sports)
  //   'attempt' — score | attempts left | best           (score-attack sports)

  /** versus HUD — two scores either side of a centre round/clock chip. */
  renderVersusScorebar({ titleA, titleB } = {}) {
    this.hideTVSetup();   // gameplay started → dismiss the lobby mirror
    let o = this._sbHost();
    o.innerHTML = `
      <div style="position:absolute;top:26px;left:50%;transform:translateX(-50%);display:flex;align-items:stretch;background:var(--game-surface);border:1.5px solid var(--game-secondary-30);backdrop-filter:blur(8px);border-radius:12px;overflow:hidden;box-shadow:var(--fw-shadow-card);">
        <div style="padding:12px 24px;text-align:center;">
          <div style="font-size:12px;text-transform:uppercase;color:var(--game-muted);letter-spacing:1px;">${titleA || 'You'}</div>
          <div id="fw-vs-a" style="font-family:var(--game-mono);font-size:42px;font-weight:900;color:var(--game-gold);line-height:1;text-shadow:0 0 .35em rgba(243,216,107,.45);">0</div>
        </div>
        <div style="padding:12px 18px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,.25);">
          <div id="fw-vs-clock" style="font-family:var(--game-mono);font-size:14px;font-weight:800;color:var(--game-text);">—</div>
          <div style="font-size:10px;color:var(--game-muted);text-transform:uppercase;">vs</div>
        </div>
        <div style="padding:12px 24px;text-align:center;">
          <div style="font-size:12px;text-transform:uppercase;color:var(--game-muted);letter-spacing:1px;">${titleB || 'CPU'}</div>
          <div id="fw-vs-b" style="font-family:var(--game-mono);font-size:42px;font-weight:900;color:var(--game-text);line-height:1;">0</div>
        </div>
      </div>`;
    o.style.display = 'block';
  }
  updateVersusScorebar(state = {}) {
    const set = (id, v) => { const e = document.getElementById(id); if (e != null && e) e.textContent = v; };
    set('fw-vs-a', state.you != null ? state.you : 0);
    set('fw-vs-b', state.cpu != null ? state.cpu : 0);
    set('fw-vs-clock', state.clock != null ? state.clock
      : (state.rounds ? `R${state.round || 0}/${state.rounds}` : (state.round || '—')));
  }

  /** attempt HUD — score, attempts remaining, personal best. */
  renderAttemptScorebar({ title } = {}) {
    this.hideTVSetup();   // gameplay started → dismiss the lobby mirror
    let o = this._sbHost();
    o.innerHTML = `
      <div style="position:absolute;top:26px;left:50%;transform:translateX(-50%);display:flex;background:var(--game-surface);border:1.5px solid var(--game-secondary-30);backdrop-filter:blur(8px);border-radius:12px;overflow:hidden;box-shadow:var(--fw-shadow-card);">
        <div style="padding:12px 24px;text-align:center;">
          <div style="font-size:12px;text-transform:uppercase;color:var(--game-muted);letter-spacing:1px;">${title || 'Score'}</div>
          <div id="fw-at-score" style="font-family:var(--game-mono);font-size:42px;font-weight:900;color:var(--game-gold);line-height:1;text-shadow:0 0 .35em rgba(243,216,107,.45);">0</div>
        </div>
        <div style="padding:12px 22px;text-align:center;border-left:1px solid var(--fw-line);">
          <div style="font-size:11px;text-transform:uppercase;color:var(--game-muted);">Left</div>
          <div id="fw-at-left" style="font-family:var(--game-mono);font-size:24px;font-weight:900;color:var(--game-text);">0</div>
        </div>
        <div style="padding:12px 22px;text-align:center;border-left:1px solid var(--fw-line);">
          <div style="font-size:11px;text-transform:uppercase;color:var(--game-muted);">Best</div>
          <div id="fw-at-best" style="font-family:var(--game-mono);font-size:24px;font-weight:900;color:var(--game-text);">0</div>
        </div>
      </div>`;
    o.style.display = 'block';
  }
  updateAttemptScorebar(state = {}) {
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    set('fw-at-score', state.score != null ? state.score : 0);
    const left = state.attempts != null ? Math.max(0, state.attempts - (state.attempt || 0)) : (state.left || 0);
    set('fw-at-left', left);
    set('fw-at-best', state.best != null ? state.best : 0);
  }

  /**
   * FLAT / generic HUD — placeholder info slots with DEVELOPER-IDENTIFIABLE names so a
   * new game (from the starter template) shows clearly-labelled boxes to rename. Not
   * sport-specific on purpose. opts: { title, labels:['SLOT 1','SLOT 2','SLOT 3'] }
   * Update with updateScorebar('flat', { slots:[v1,v2,v3] }).
   */
  renderFlatScorebar({ title, labels } = {}) {
    this.hideTVSetup();
    const L = (labels && labels.length) ? labels : ['SLOT 1', 'SLOT 2', 'SLOT 3'];
    let o = this._sbHost();
    const cells = L.map((lbl, i) => `
      <div style="padding:12px 22px;${i ? 'border-left:1px solid var(--fw-line);' : ''}text-align:center;">
        <div style="font-size:11px;text-transform:uppercase;color:var(--game-muted);letter-spacing:1px;">${lbl}</div>
        <div id="fw-flat-${i}" style="font-family:var(--game-mono);font-size:30px;font-weight:900;color:var(--game-gold);line-height:1;">—</div>
      </div>`).join('');
    o.innerHTML = `
      <div style="position:absolute;top:26px;left:50%;transform:translateX(-50%);display:flex;background:var(--game-surface);border:1.5px dashed var(--game-secondary-40);backdrop-filter:blur(8px);border-radius:12px;overflow:hidden;box-shadow:var(--fw-shadow-card);">
        ${cells}
      </div>
      <div style="position:absolute;top:96px;left:50%;transform:translateX(-50%);font-size:11px;color:var(--game-muted);">▢ generic HUD — rename slots &amp; pick a kind in renderScorebar()</div>`;
    o.style.display = 'block';
  }
  updateFlatScorebar(state = {}) {
    const vals = state.slots || [state.a, state.b, state.c];
    for (let i = 0; i < 3; i++) {
      const e = document.getElementById('fw-flat-' + i);
      if (e) e.textContent = (vals[i] == null ? '—' : vals[i]);
    }
  }

  /** Shared scorebar host element (one overlay reused by all HUD kinds). */
  _sbHost() {
    let o = document.getElementById('fw-tv-scorebar');
    if (!o) {
      o = document.createElement('div');
      o.id = 'fw-tv-scorebar';
      o.style.cssText = 'position:fixed;inset:0;z-index:20;pointer-events:none;display:none;';
      document.body.appendChild(o);
    }
    return o;
  }

  /** Dispatcher — pick HUD by kind ('chase'|'versus'|'attempt'|'flat'). */
  renderScorebar(kind, opts = {}) {
    if (kind === 'versus') return this.renderVersusScorebar(opts);
    if (kind === 'attempt') return this.renderAttemptScorebar(opts);
    if (kind === 'flat' || kind === 'generic') return this.renderFlatScorebar(opts);
    return this.renderTVScorebar(opts);
  }
  updateScorebar(kind, state = {}) {
    if (kind === 'versus') return this.updateVersusScorebar(state);
    if (kind === 'attempt') return this.updateAttemptScorebar(state);
    if (kind === 'flat' || kind === 'generic') return this.updateFlatScorebar(state);
    return this.updateTVScorebar(state);
  }

  /** Big centre banner flash (SIX!, FOUR!, etc). Auto-fades. */
  showTVBanner(text, color, sub) {
    let o = document.getElementById('fw-tv-banner');
    if (!o) {
      o = document.createElement('div');
      o.id = 'fw-tv-banner';
      o.style.cssText = 'position:fixed;left:50%;top:38%;transform:translate(-50%,-50%) scale(1);z-index:40;pointer-events:none;text-align:center;opacity:0;transition:opacity .25s,transform .25s;';
      document.body.appendChild(o);
    }
    o.innerHTML = `<div style="font-size:82px;font-weight:900;letter-spacing:2px;color:${color || '#ffd700'};text-shadow:0 6px 30px rgba(0,0,0,.6);">${text}</div>${sub ? `<div style="font-size:22px;font-weight:600;color:var(--game-text);margin-top:6px;">${sub}</div>` : ''}`;
    o.style.opacity = '1';
    o.style.transform = 'translate(-50%,-50%) scale(1.12)';
    clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => {
      o.style.opacity = '0';
      o.style.transform = 'translate(-50%,-50%) scale(.9)';
    }, 1300);
  }

  /**
   * TV match intro — sport-neutral "A  VS  B" hero with optional sub + accent.
   * Works for any sport (cricket/baseball/tennis/football); theme-driven. Pair with
   * startTVCountdown() for the 3-2-1. opts: { titleA, titleB, sub, colorA, colorB }
   */
  renderTVIntro(opts = {}) {
    let o = document.getElementById('fw-tv-intro');
    if (!o) {
      o = document.createElement('div');
      o.id = 'fw-tv-intro';
      o.style.cssText = 'position:fixed;inset:0;z-index:9300;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 30%, rgba(255,255,255,.06), rgba(5,10,22,.96) 70%);';
      document.body.appendChild(o);
    }
    const dot = (c) => `<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:${c || 'var(--game-accent)'};box-shadow:0 0 0 3px rgba(255,255,255,.12);vertical-align:middle;margin-bottom:10px;"></span>`;
    const side = (t, c) => `<div style="text-align:center;min-width:200px;"><div>${dot(c)}</div>
      <div style="font-size:40px;font-weight:900;color:var(--game-text);">${t || ''}</div></div>`;
    o.innerHTML = `
      <div style="text-align:center;padding:40px;">
        <div style="display:flex;align-items:center;justify-content:center;gap:40px;">
          ${side(opts.titleA, opts.colorA)}
          <div style="font-size:30px;font-weight:900;color:var(--game-muted);">VS</div>
          ${side(opts.titleB, opts.colorB)}
        </div>
        ${opts.sub ? `<div style="margin-top:22px;font-size:18px;font-weight:700;color:var(--game-accent);letter-spacing:.04em;">${opts.sub}</div>` : ''}
      </div>`;
    o.style.display = 'flex';
  }
  hideTVIntro() { const o = document.getElementById('fw-tv-intro'); if (o) o.style.display = 'none'; }

  /**
   * TV countdown — big 3-2-1 pops, then onDone(). Sport-neutral broadcast polish.
   * Uses requestAnimationFrame timing supplied by the caller's setTimeout (no Date).
   * @param {number} from start number (e.g. 3) @param {function} onDone
   */
  startTVCountdown(from = 3, onDone) {
    let o = document.getElementById('fw-tv-countdown');
    if (!o) {
      o = document.createElement('div');
      o.id = 'fw-tv-countdown';
      o.style.cssText = 'position:fixed;inset:0;z-index:9350;display:flex;align-items:center;justify-content:center;pointer-events:none;';
      document.body.appendChild(o);
    }
    o.style.display = 'flex';
    let n = from;
    const tick = () => {
      if (n <= 0) {
        o.style.display = 'none';
        if (onDone) onDone();
        return;
      }
      o.innerHTML = `<div style="font-family:var(--game-mono);font-size:180px;font-weight:900;color:var(--game-accent);text-shadow:0 8px 40px rgba(0,0,0,.6);animation:fwCdPop .9s var(--fw-ease-pop,ease-out);">${n}</div>
        <style>@keyframes fwCdPop{0%{transform:scale(.4);opacity:0}30%{transform:scale(1.15);opacity:1}100%{transform:scale(1);opacity:.9}}</style>`;
      n--;
      this._cdTimer = setTimeout(tick, 1000);
    };
    tick();
  }
  stopTVCountdown() { clearTimeout(this._cdTimer); const o = document.getElementById('fw-tv-countdown'); if (o) o.style.display = 'none'; }

  /**
   * TV milestone flash — generic "kicker / BIG / sub" celebration (50, 100, streaks,
   * new best…). Sport-neutral; auto-fades. opts: { kicker, big, sub, color }
   */
  showTVMilestone({ kicker, big, sub, color } = {}) {
    let o = document.getElementById('fw-tv-milestone');
    if (!o) {
      o = document.createElement('div');
      o.id = 'fw-tv-milestone';
      o.style.cssText = 'position:fixed;inset:0;z-index:9450;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;background:radial-gradient(ellipse at 50% 50%, rgba(0,0,0,.30), rgba(0,0,0,.72));opacity:0;transition:opacity .25s;';
      document.body.appendChild(o);
    }
    const c = color || 'var(--game-accent)';
    o.innerHTML = `
      <div style="font-size:36px;font-weight:900;letter-spacing:.3em;text-transform:uppercase;color:${c};">${kicker || ''}</div>
      <div style="font-family:var(--game-mono);font-size:240px;font-weight:900;line-height:1;color:${c};text-shadow:0 10px 50px rgba(0,0,0,.6);animation:fwMiPop .6s var(--fw-ease-pop, ease-out);">${big != null ? big : ''}</div>
      ${sub ? `<div style="font-size:22px;font-weight:700;color:var(--game-text);margin-top:8px;">${sub}</div>` : ''}
      <style>@keyframes fwMiPop{0%{transform:scale(.3);opacity:0}45%{transform:scale(1.15);opacity:1}100%{transform:scale(1)}}</style>`;
    o.style.opacity = '1';
    clearTimeout(this._miTimer);
    this._miTimer = setTimeout(() => { o.style.opacity = '0'; }, 2600);
  }

  /**
   * Full-screen TV Loading overlay (logo + progress bar + message).
   * Call updateTVLoading(pct) to advance the bar; hideTVLoading() to dismiss.
   */
  renderTVLoading({ logoUrl, message } = {}) {
    let o = document.getElementById('fw-tv-loading');
    if (!o) {
      o = document.createElement('div');
      o.id = 'fw-tv-loading';
      o.style.cssText = 'position:fixed;inset:0;z-index:9000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;background:var(--game-primary);';
      document.body.appendChild(o);
    }
    o.innerHTML = `
      ${logoUrl ? `<img src="${logoUrl}" alt="" style="width:140px;height:140px;object-fit:contain;"/>` : ''}
      <div style="width:280px;max-width:60vw;height:6px;border-radius:6px;background:rgba(255,255,255,0.08);overflow:hidden;">
        <div id="fw-tv-loading-bar" style="height:100%;width:0%;background:var(--game-accent);transition:width .3s ease;"></div>
      </div>
      <div style="font-size:16px;font-weight:700;color:var(--game-muted);">${message || 'Loading…'}</div>
    `;
    o.style.display = 'flex';
  }

  updateTVLoading(pct) {
    const bar = document.getElementById('fw-tv-loading-bar');
    if (bar) bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
  }

  hideTVLoading() {
    const o = document.getElementById('fw-tv-loading');
    if (o) o.style.display = 'none';
  }

  /**
   * TV Result / game-over screen.
   * @param {object} opts { bannerText, winner, stats:[{label,value}], primaryText,
   *   onPrimary, secondaryText, onSecondary }
   */
  /**
   * Series progress dots (M1✗ / M2● / M3◌). Shared by TV + phone match-end.
   * `series` = a FrameworkSeries.standings() view-model: { total, matchNum, done, results }.
   * Returns '' when there's no multi-match series.
   */
  _seriesDots(series) {
    if (!series || !series.total || series.total < 2) return '';
    const total = series.total;
    const results = Array.isArray(series.results) ? series.results : [];
    const cur = series.done ? -1 : ((series.matchNum || results.length + 1) - 1);   // 0-based current match
    let out = '';
    for (let i = 0; i < total; i++) {
      let bd = 'var(--game-muted)', bg = 'transparent', col = 'var(--game-muted)', dash = 'dashed', glyph = `M${i + 1}`;
      if (i < results.length) {
        const w = results[i] === 'win';
        bd = w ? 'var(--game-accent)' : 'var(--game-danger)'; col = bd; dash = 'solid';
        bg = w ? 'var(--game-accent-12)' : 'rgba(255,68,68,.12)'; glyph = `${w ? '✓' : '✗'} M${i + 1}`;
      } else if (i === cur) {
        bd = 'var(--game-gold)'; col = 'var(--game-gold)'; bg = 'rgba(243,216,107,.12)'; dash = 'solid';
      }
      out += `<div style="min-width:46px;padding:6px 9px;border:1.5px ${dash} ${bd};border-radius:10px;background:${bg};color:${col};font-size:12px;font-weight:800;text-align:center;">${glyph}</div>`;
    }
    return `<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">${out}</div>`;
  }

  renderTVResult(opts = {}) {
    let o = document.getElementById('fw-tv-result');
    if (!o) {
      o = document.createElement('div');
      o.id = 'fw-tv-result';
      o.style.cssText = 'position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;background:rgba(5,10,22,0.92);';
      document.body.appendChild(o);
    }
    const loss = opts.won === false;
    const bannerBg = loss
      ? 'linear-gradient(135deg,rgba(42,24,24,.95) 0%,rgba(26,13,18,.95) 100%)'
      : 'linear-gradient(135deg,rgba(26,40,16,.95) 0%,rgba(13,36,16,.95) 100%)';
    const bannerBorder = loss ? 'rgba(122,32,32,.65)' : 'var(--game-secondary-45)';
    const bannerGlow = loss ? 'rgba(255,80,80,.14)' : 'rgba(126,219,126,.14)';
    const icon = opts.icon != null ? opts.icon : (loss ? '' : '🏆');

    // stats grid — JetBrains-mono gold values, uppercase muted labels (CricSwing .me-stat)
    const stats = (opts.stats || []).map(s => `
      <div style="background:rgba(0,0,0,.28);border-radius:11px;padding:12px 6px;text-align:center;">
        <div style="font-family:var(--game-mono);font-size:30px;font-weight:900;color:var(--game-gold);line-height:1;">${s.value}</div>
        <div style="font-size:10px;color:var(--game-muted);text-transform:uppercase;letter-spacing:.14em;margin-top:.45em;font-weight:700;">${s.label}</div>
      </div>`).join('');

    // Optional dual scoreboard (two team cards). opts.scoreboard = { user, opp }
    const teamCard = (t, won) => t ? `
      <div style="flex:1;min-width:140px;background:rgba(7,16,12,.6);border:2px solid ${won ? 'var(--game-gold)' : 'var(--fw-line)'};border-radius:14px;padding:14px;text-align:center;${won ? 'box-shadow:0 0 24px rgba(243,216,107,.18);' : ''}">
        ${t.color ? `<div style="width:40px;height:40px;border-radius:50%;margin:0 auto 8px;background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.35),rgba(0,0,0,.15)),${t.color};"></div>` : ''}
        <div style="font-size:15px;font-weight:800;color:var(--game-text);">${t.name || ''}</div>
        <div style="font-family:var(--game-mono);font-size:34px;font-weight:900;color:${won ? 'var(--game-gold)' : 'var(--game-text)'};line-height:1.1;margin-top:4px;">${t.score != null ? t.score : ''}</div>
        ${t.sub ? `<div style="font-size:11px;color:var(--game-muted);margin-top:4px;">${t.sub}</div>` : ''}
      </div>` : '';
    const sb = opts.scoreboard
      ? `<div style="display:flex;gap:12px;align-items:stretch;">${teamCard(opts.scoreboard.user, opts.scoreboard.user && opts.scoreboard.user.winner)}${teamCard(opts.scoreboard.opp, opts.scoreboard.opp && opts.scoreboard.opp.winner)}</div>`
      : '';

    // Optional quote + series progress strip.
    const quote = opts.quote
      ? `<div style="text-align:center;padding:10px 18px;color:var(--game-muted);"><span style="font-style:italic;font-size:15px;">“${opts.quote.text}”</span>${opts.quote.by ? `<div style="font-size:12px;color:var(--game-gold);margin-top:4px;font-weight:700;">— ${opts.quote.by}</div>` : ''}</div>`
      : '';
    const seriesDots = opts.series ? this._seriesDots(opts.series) : '';
    const series = opts.series
      ? `<div style="display:flex;flex-direction:column;gap:10px;align-items:center;">
          <div style="font-size:13px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--game-accent);">${opts.series.label || ''}${opts.series.userWins != null ? ` · ${opts.series.userWins}–${opts.series.cpuWins}` : ''}</div>
          ${seriesDots}</div>`
      : '';

    o.innerHTML = `
      <div style="width:min(92vw,820px);display:flex;flex-direction:column;gap:16px;padding:24px;">
        <div style="padding:18px 24px;border-radius:18px;text-align:center;background:${bannerBg};border:2px solid ${bannerBorder};box-shadow:0 18px 50px rgba(0,0,0,.55),0 0 90px ${bannerGlow} inset;animation:fwBannerIn .6s var(--fw-ease-out) both;">
          ${icon ? `<div style="font-size:54px;line-height:1;filter:drop-shadow(0 6px 20px rgba(255,215,0,.45));animation:fwPop .7s var(--fw-ease-pop) backwards;">${icon}</div>` : ''}
          <div style="font-size:22px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:${loss ? '#ff6b6b' : 'var(--game-gold)'};margin-top:6px;">${opts.bannerText || 'Match Over'}</div>
          ${opts.winner ? `<div style="font-family:var(--game-mono);font-size:52px;font-weight:900;color:var(--game-text);line-height:1.05;margin-top:6px;">${opts.winner}</div>` : ''}
          ${opts.sub ? `<div style="font-size:14px;color:var(--game-accent);font-weight:700;margin-top:6px;">${opts.sub}</div>` : ''}
        </div>
        ${sb}
        ${opts.pom ? `<div style="display:flex;align-items:center;gap:14px;padding:14px 18px;border-radius:14px;text-align:left;background:var(--game-surface-soft);border:1.5px solid var(--game-secondary-28);">${opts.pom}</div>` : ''}
        ${stats ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:10px;">${stats}</div>` : ''}
        ${quote}
        ${series}
        <div style="display:flex;gap:16px;justify-content:center;margin-top:6px;">
          ${opts.primaryText ? `<button class="btn btn-primary" id="fw-result-primary" style="flex:0 0 auto;font-size:18px;padding:14px 36px;">${opts.primaryText}</button>` : ''}
          ${opts.secondaryText ? `<button class="btn btn-secondary" id="fw-result-secondary" style="flex:0 0 auto;font-size:18px;padding:14px 36px;">${opts.secondaryText}</button>` : ''}
        </div>
      </div>
    `;
    o.style.display = 'flex';
    const p = document.getElementById('fw-result-primary');
    const s = document.getElementById('fw-result-secondary');
    if (p && opts.onPrimary) p.onclick = opts.onPrimary;
    if (s && opts.onSecondary) s.onclick = opts.onSecondary;
  }

  hideTVResult() {
    const o = document.getElementById('fw-tv-result');
    if (o) o.style.display = 'none';
  }

  /**
   * TV Setup overlay — mirrors the phone lobby live on the big screen while the
   * player picks team / format / kicks off, CricSwing-style. Driven by the
   * `lobby_step` messages the phone relays (see framework/flow/lobby-flow.js); the
   * generic listener in framework/core/game.js (_initScreen) calls this. It auto-
   * hides the moment a real game HUD renders (see renderTVScorebar etc.).
   *
   * @param {object} state { phase:'connected'|'pick'|'ceremony'|'ready', kind?,
   *   selection:{ title, team, teamShort, teamColor, opp, oppShort, oppColor,
   *               format, formatName, rounds, overs, target, cpu } }
   */
  showTVSetup(state = {}) {
    const s = state.selection || {};
    const phase = state.phase || 'connected';
    const esc = (v) => String(v == null ? '' : v).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
    this.hideTVResult();   // returning to the lobby clears any stale match-end overlay (it sits above this)

    let o = document.getElementById('fw-tv-setup');
    if (!o) {
      o = document.createElement('div');
      o.id = 'fw-tv-setup';
      o.style.cssText = 'position:fixed;inset:0;z-index:9400;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 120%, var(--game-secondary-12), #060a14 70%), #060a14;';
      document.body.appendChild(o);
    }

    // Brand mark (CricSwing-style header): logo + title, pulled from the game's config.
    let logoSrc = '', appTitle = s.title || '';
    try { if (window.FrameworkAssets) { logoSrc = window.FrameworkAssets.resolve('APP_LOGO') || ''; appTitle = window.FrameworkAssets.text('APP_TITLE') || appTitle; } } catch (_) {}
    const brand = `<div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:22px;">
      ${logoSrc ? `<img src="${esc(logoSrc)}" alt="" style="height:30px;width:auto;">` : ''}
      <span style="font-size:22px;font-weight:900;letter-spacing:.3px;color:var(--game-text);">${esc(appTitle)}</span></div>`;

    // Title with the last word painted in the accent (CricSwing "Choose your <mode>").
    const titleAccent = (t) => {
      const w = String(t || '').trim().split(/\s+/);
      if (w.length < 2) return `<span style="color:var(--game-accent);">${esc(t || '')}</span>`;
      const last = w.pop();
      return `${esc(w.join(' '))} <span style="color:var(--game-accent);">${esc(last)}</span>`;
    };

    // Spinner waiting chip (CricSwing "Waiting for your pick…").
    const waitChip = (line, sub) => `<div style="display:inline-flex;align-items:center;gap:12px;margin-top:34px;padding:12px 22px;border-radius:999px;background:var(--game-surface-soft);border:1.5px solid var(--game-secondary-30);box-shadow:var(--fw-shadow-card);">
      <span style="width:18px;height:18px;border-radius:50%;border:2.5px solid var(--game-secondary-35);border-top-color:var(--game-accent);display:inline-block;animation:fwSpin .8s linear infinite;"></span>
      <span style="text-align:left;line-height:1.25;"><span style="display:block;font-size:15px;font-weight:800;color:var(--game-accent);">${esc(line)}</span>
      <span style="display:block;font-size:13px;color:var(--game-muted);">${esc(sub)}</span></span></div>`;

    const dot = (c) => `<span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:${c || 'var(--game-accent)'};box-shadow:0 0 0 3px rgba(255,255,255,.12);vertical-align:middle;"></span>`;

    let body = '';
    if (phase === 'choosing') {
      // A lobby pick screen mirrored to the TV: pill kicker, big title, options row, wait chip.
      const opts = Array.isArray(state.options) ? state.options.filter(Boolean) : [];
      const optionsRow = opts.length
        ? `<div style="font-size:clamp(15px,1.5vw,22px);font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#7fb8c8;margin-top:18px;">${opts.map(esc).join('  ·  ')}</div>`
        : '';
      const noun = esc(state.keyName || 'option');
      body = `
        <div style="display:inline-block;font-size:13px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:var(--game-accent);padding:7px 18px;border:1.5px solid var(--game-secondary-40);border-radius:999px;">${esc(state.kicker || ('Pick your ' + noun).toUpperCase())}</div>
        <h1 style="font-size:clamp(40px,7vw,76px);font-weight:900;line-height:1.05;margin:22px 0 0;color:var(--game-text);">${titleAccent(state.stepTitle)}</h1>
        ${optionsRow}
        ${waitChip('Waiting for your pick…', `Choose a ${noun} on your phone.`)}`;
    } else if (phase === 'ceremony') {
      const emoji = state.kind === 'toss' ? '🪙' : '⚽';
      const anim = state.kind === 'toss' ? 'fwCoinFlip 1.4s ease-in-out infinite' : 'fwBallKick 1.1s ease-in-out infinite';
      const label = state.kind === 'toss' ? 'Tossing…' : 'Kicking off…';
      body = `<div style="font-size:clamp(80px,11vw,120px);line-height:1;animation:${anim};filter:drop-shadow(0 12px 26px rgba(0,0,0,.5));">${emoji}</div>
        <div style="font-size:clamp(18px,2vw,22px);font-weight:800;color:var(--game-text);margin-top:18px;">${label}</div>`;
    } else if (phase === 'ready') {
      const vs = s.team ? `<div style="display:flex;align-items:center;justify-content:center;gap:clamp(18px,3vw,40px);margin:6px 0 22px;">
        <div style="text-align:center;min-width:140px;"><div style="margin-bottom:8px;">${dot(s.teamColor)}</div>
          <div style="font-size:clamp(22px,2.6vw,32px);font-weight:900;color:var(--game-text);">${esc(s.team)}</div>
          <div style="font-size:12px;color:var(--game-muted);text-transform:uppercase;letter-spacing:1px;">You</div></div>
        <div style="font-size:clamp(20px,2.2vw,28px);font-weight:900;color:var(--game-muted);">VS</div>
        <div style="text-align:center;min-width:140px;"><div style="margin-bottom:8px;">${dot(s.oppColor)}</div>
          <div style="font-size:clamp(22px,2.6vw,32px);font-weight:900;color:var(--game-text);">${esc(s.opp || 'Opponent')}</div>
          <div style="font-size:12px;color:var(--game-muted);text-transform:uppercase;letter-spacing:1px;">CPU</div></div></div>` : '';
      const target = s.target
        ? `<div style="font-size:clamp(16px,1.8vw,20px);color:var(--game-muted);margin-top:8px;">Target <b style="color:var(--game-accent);font-size:clamp(24px,3vw,32px);">${esc(s.target)}</b>${s.overs ? ` in ${esc(s.overs)} over${s.overs > 1 ? 's' : ''}` : ''}</div>`
        : '';
      body = `${vs}<div style="font-size:clamp(34px,5vw,52px);font-weight:900;letter-spacing:2px;color:var(--game-accent);animation:fwPulse 1.1s ease-in-out infinite;">MATCH READY</div>${target}`;
    } else {
      body = `<h1 style="font-size:clamp(34px,5vw,56px);font-weight:900;color:var(--game-text);margin:0;">Paired<span style="color:var(--game-accent);">!</span></h1>
        ${waitChip('Setting up…', 'Continue on your phone.')}`;
    }

    o.innerHTML = `
      <style>
        @keyframes fwBallKick { 0%,100%{ transform:translateY(0) rotate(0);} 50%{ transform:translateY(-26px) rotate(180deg);} }
        @keyframes fwCoinFlip { 0%,100%{ transform:rotateY(0) scale(1);} 50%{ transform:rotateY(900deg) scale(1.15);} }
        @keyframes fwPulse { 0%,100%{ transform:scale(1); opacity:1;} 50%{ transform:scale(1.06); opacity:.82;} }
        @keyframes fwSpin { to { transform:rotate(360deg); } }
      </style>
      <div style="text-align:center;max-width:980px;padding:5vh 40px;">
        ${brand}
        ${body}
      </div>`;
    o.style.display = 'flex';
  }

  hideTVSetup() {
    const o = document.getElementById('fw-tv-setup');
    if (o) o.style.display = 'none';
  }

  /**
   * TV Disconnected overlay — passive, auto-reconnecting (no remote needed).
   */
  renderTVDisconnected({ message } = {}) {
    let o = document.getElementById('fw-tv-disconnected');
    if (!o) {
      o = document.createElement('div');
      o.id = 'fw-tv-disconnected';
      o.style.cssText = 'position:fixed;inset:0;z-index:9600;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:rgba(5,10,22,0.95);';
      document.body.appendChild(o);
    }
    o.innerHTML = `
      <div style="font-size:64px;">📡</div>
      <div style="font-size:24px;font-weight:800;color:var(--game-text);">${message || 'Connection lost'}</div>
      <div style="font-size:15px;color:var(--game-muted);">Reconnecting automatically…</div>
      <div style="width:200px;height:4px;border-radius:4px;overflow:hidden;background:rgba(255,255,255,0.08);">
        <div style="height:100%;width:40%;background:var(--game-accent);animation:fwIndet 1.2s infinite;"></div>
      </div>
      <style>@keyframes fwIndet{0%{margin-left:-40%}100%{margin-left:100%}}</style>
    `;
    o.style.display = 'flex';
  }

  hideTVDisconnected() {
    const o = document.getElementById('fw-tv-disconnected');
    if (o) o.style.display = 'none';
  }

  // ── Optional pre-match / match-flow screens (all gated by the game's config) ──

  /**
   * Pre-match sequence: team-vs-team intro hold, then a 3-2-1 countdown, then onDone.
   * Combines renderTVIntro + startTVCountdown so games get the broadcast open in one
   * call. opts: { titleA, titleB, sub, colorA, colorB, hold?:2200, countdownFrom?:3 }
   */
  runTVPreMatch(opts = {}, onDone) {
    this.renderTVIntro(opts);
    const hold = opts.hold != null ? opts.hold : 2200;
    setTimeout(() => {
      this.hideTVIntro();
      if (opts.countdownFrom === 0) { if (onDone) onDone(); return; }
      this.startTVCountdown(opts.countdownFrom != null ? opts.countdownFrom : 3, onDone);
    }, hold);
  }

  /**
   * Over / round summary overlay — stat tiles + ball-by-ball pills + auto-advance.
   * opts: { title, score, stats:[{label,value,color}], balls:[{label,color}],
   *   seconds?:5, nextLabel?, onDone }
   */
  renderTVOverSummary(opts = {}) {
    let o = this._overlay('fw-tv-oversum', 9420, 'radial-gradient(ellipse at 50% 30%, rgba(255,255,255,.05), rgba(5,10,22,.97) 70%)');
    const tiles = (opts.stats || []).map((s, i) => `
      <div style="background:rgba(0,0,0,.3);border-radius:12px;padding:14px 8px;text-align:center;animation:fwBannerIn .4s var(--fw-ease-out) ${i * 0.05}s both;">
        <div style="font-family:var(--game-mono);font-size:30px;font-weight:900;color:${s.color || 'var(--game-gold)'};line-height:1;">${s.value}</div>
        <div style="font-size:10px;color:var(--game-muted);text-transform:uppercase;letter-spacing:.12em;margin-top:6px;font-weight:700;">${s.label}</div>
      </div>`).join('');
    const pills = (opts.balls || []).map(b => `<span style="min-width:30px;height:30px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-family:var(--game-mono);font-weight:900;font-size:13px;background:${b.color || 'rgba(255,255,255,.08)'};color:${b.fg || 'var(--game-text)'};">${b.label}</span>`).join('');
    o.innerHTML = `
      <div style="width:min(92vw,720px);text-align:center;padding:28px;">
        <div style="font-size:14px;font-weight:800;letter-spacing:.25em;text-transform:uppercase;color:var(--game-accent);">${opts.title || 'End of Over'}</div>
        ${opts.score ? `<div style="font-family:var(--game-mono);font-size:42px;font-weight:900;color:var(--game-text);margin-top:6px;">${opts.score}</div>` : ''}
        ${pills ? `<div style="display:flex;gap:8px;justify-content:center;margin:18px 0;flex-wrap:wrap;">${pills}</div>` : ''}
        ${tiles ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(80px,1fr));gap:10px;margin-top:8px;">${tiles}</div>` : ''}
        <div style="font-size:13px;color:var(--game-muted);margin-top:22px;">${opts.nextLabel || 'Next over starting…'}</div>
      </div>`;
    o.style.display = 'flex';
    const secs = opts.seconds != null ? opts.seconds : 5;
    clearTimeout(this._oversumTimer);
    this._oversumTimer = setTimeout(() => { this.hideTVOverSummary(); if (opts.onDone) opts.onDone(); }, secs * 1000);
  }
  hideTVOverSummary() { const o = document.getElementById('fw-tv-oversum'); if (o) o.style.display = 'none'; }

  /**
   * Interval / break screen (innings change, drinks, round break).
   * opts: { kind, title, sub, stats:[{label,value}], seconds?, onDone }
   */
  renderTVBreak(opts = {}) {
    let o = this._overlay('fw-tv-break', 9410, 'radial-gradient(ellipse at 50% 50%, rgba(74,170,255,.06), rgba(5,10,22,.96) 70%)');
    const icon = opts.kind === 'drinks' ? '🥤' : opts.kind === 'innings' ? '🔁' : '⏸';
    const stats = (opts.stats || []).map(s => `
      <div style="text-align:center;"><div style="font-family:var(--game-mono);font-size:34px;font-weight:900;color:var(--game-gold);line-height:1;">${s.value}</div>
      <div style="font-size:11px;color:var(--game-muted);text-transform:uppercase;letter-spacing:.1em;margin-top:6px;">${s.label}</div></div>`).join('');
    o.innerHTML = `
      <div style="text-align:center;padding:30px;">
        <div style="font-size:56px;">${icon}</div>
        <div style="font-size:24px;font-weight:900;color:var(--game-text);margin-top:10px;">${opts.title || 'Break'}</div>
        ${opts.sub ? `<div style="font-size:14px;color:var(--game-muted);margin-top:6px;">${opts.sub}</div>` : ''}
        ${stats ? `<div style="display:flex;gap:34px;justify-content:center;margin-top:24px;">${stats}</div>` : ''}
      </div>`;
    o.style.display = 'flex';
    if (opts.seconds != null) {
      clearTimeout(this._breakTimer);
      this._breakTimer = setTimeout(() => { this.hideTVBreak(); if (opts.onDone) opts.onDone(); }, opts.seconds * 1000);
    }
  }
  hideTVBreak() { const o = document.getElementById('fw-tv-break'); if (o) o.style.display = 'none'; }

  /**
   * Phone-away overlay — controller stepped out mid-match; passive, auto-resumes.
   * opts: { message }
   */
  renderTVAway({ message } = {}) {
    let o = this._overlay('fw-tv-away', 9580, 'radial-gradient(ellipse at 50% 50%, rgba(243,216,107,.06), rgba(5,10,22,.95) 70%)');
    o.innerHTML = `
      <div style="text-align:center;padding:30px;">
        <div style="font-size:64px;">😴</div>
        <div style="font-size:24px;font-weight:800;color:var(--game-gold);margin-top:10px;">${message || 'Player stepped out'}</div>
        <div style="font-size:15px;color:var(--game-muted);margin-top:8px;">Waiting for the phone to reconnect — the match resumes automatically.</div>
        <div style="margin-top:20px;font-size:30px;letter-spacing:6px;color:var(--game-muted);animation:fwBlink 1.2s infinite;">• • •</div>
        <style>@keyframes fwBlink{0%,100%{opacity:.3}50%{opacity:1}}</style>
      </div>`;
    o.style.display = 'flex';
  }
  hideTVAway() { const o = document.getElementById('fw-tv-away'); if (o) o.style.display = 'none'; }

  /**
   * Active re-pair prompt — connection truly lost; show a fresh code + retry.
   * opts: { code, message, onRepair, onWait }
   */
  renderTVRepair({ code, message, onRepair, onWait } = {}) {
    let o = this._overlay('fw-tv-repair', 9620, '#07100C');
    o.innerHTML = `
      <div style="text-align:center;padding:30px;max-width:560px;">
        <div style="font-size:54px;">⚡</div>
        <div style="font-size:26px;font-weight:900;color:var(--game-accent);margin-top:8px;">Phone Disconnected</div>
        <div style="font-size:15px;color:var(--game-muted);margin-top:8px;">${message || 'Lost the link to your phone. It may have changed Wi-Fi address.'}</div>
        ${code ? `<div class="pairing-code" style="font-size:56px;margin:18px 0;">${code}</div>` : ''}
        <div style="display:flex;gap:14px;justify-content:center;margin-top:18px;">
          <button class="btn btn-primary" id="fw-repair-go" style="flex:0 0 auto;padding:13px 28px;">Get a New Code</button>
          <button class="btn btn-secondary" id="fw-repair-wait" style="flex:0 0 auto;padding:13px 28px;">Keep Waiting</button>
        </div>
      </div>`;
    o.style.display = 'flex';
    const g = document.getElementById('fw-repair-go'), w = document.getElementById('fw-repair-wait');
    if (g) g.onclick = () => { if (onRepair) onRepair(); };
    if (w) w.onclick = () => { this.hideTVRepair(); if (onWait) onWait(); };
  }
  hideTVRepair() { const o = document.getElementById('fw-tv-repair'); if (o) o.style.display = 'none'; }

  // ══ OPTIONAL motion/swing TV screens (gated; rendered only when a game calls them) ══
  // Sport-neutral so Baseball (pitch/timing) and a future cricket swing mode reuse them.

  /** TV stance mirror — shows the player's stance art + a "locking…" hold bar. */
  renderTVStance({ art, holdPct = 0, label } = {}) {
    const o = this._overlay('fw-tv-stance', 9360, 'radial-gradient(ellipse at 50% 60%, var(--game-secondary-06), #060a14 70%)');
    o.innerHTML = `
      <div style="text-align:center;padding:30px;">
        <div style="font-size:96px;line-height:1;">${art || '🧍'}</div>
        <div style="font-size:20px;font-weight:800;color:var(--game-text);margin-top:14px;">${label || 'Get into your stance'}</div>
        <div style="width:min(60vw,320px);height:8px;border-radius:8px;background:rgba(255,255,255,.08);overflow:hidden;margin:18px auto 0;">
          <div id="fw-tv-stance-bar" style="height:100%;width:${Math.max(0, Math.min(100, holdPct))}%;background:var(--game-accent);transition:width .15s;"></div>
        </div>
        <div style="font-size:13px;color:var(--game-muted);margin-top:10px;">Hold steady to lock your stance</div>
      </div>`;
    o.style.display = 'flex';
  }
  updateTVStance(holdPct) { const b = document.getElementById('fw-tv-stance-bar'); if (b) b.style.width = Math.max(0, Math.min(100, holdPct)) + '%'; }
  hideTVStance() { const o = document.getElementById('fw-tv-stance'); if (o) o.style.display = 'none'; }

  /**
   * TV timing ring — a circular swing/pitch timing meter with a "sweet" arc.
   * renderTVTimingRing({ sweet:[start,end] (0..1) }) then updateTVTimingRing(progress 0..1).
   */
  renderTVTimingRing({ sweet = [0.6, 0.85] } = {}) {
    let o = document.getElementById('fw-tv-ring');
    if (!o) {
      o = document.createElement('div');
      o.id = 'fw-tv-ring';
      o.style.cssText = 'position:fixed;top:120px;left:50%;transform:translateX(-50%);z-index:25;display:none;pointer-events:none;';
      document.body.appendChild(o);
    }
    const deg = (f) => Math.round(f * 360);
    o.innerHTML = `
      <div style="position:relative;width:200px;height:200px;border-radius:50%;
        background:conic-gradient(var(--game-accent) ${deg(sweet[0])}deg ${deg(sweet[1])}deg, rgba(255,255,255,.10) 0);
        -webkit-mask:radial-gradient(circle at 50% 50%, transparent 78px, #000 80px);mask:radial-gradient(circle at 50% 50%, transparent 78px, #000 80px);"></div>
      <div id="fw-tv-ring-needle" style="position:absolute;top:0;left:50%;width:3px;height:100px;background:var(--game-gold);transform-origin:bottom center;transform:translateX(-50%) rotate(0deg);"></div>`;
    o._sweet = sweet;
    o.style.display = 'block';
  }
  updateTVTimingRing(progress) {
    const n = document.getElementById('fw-tv-ring-needle');
    if (n) n.style.transform = `translateX(-50%) rotate(${Math.max(0, Math.min(1, progress)) * 360}deg)`;
  }
  hideTVTimingRing() { const o = document.getElementById('fw-tv-ring'); if (o) o.style.display = 'none'; }

  /** TV ball/pitch brief — name + hint + intel chips (pace). chips:[{label,kind}]. */
  renderTVBallBrief({ name, hint, chips = [] } = {}) {
    let o = document.getElementById('fw-tv-ballbrief');
    if (!o) {
      o = document.createElement('div');
      o.id = 'fw-tv-ballbrief';
      o.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:26;display:none;text-align:center;background:rgba(7,16,12,.82);border:1.5px solid rgba(243,216,107,.35);border-radius:14px;padding:8px 18px;backdrop-filter:blur(8px);';
      document.body.appendChild(o);
    }
    const chipBg = { fast: 'rgba(255,90,50,.14)', medium: 'rgba(243,216,107,.14)', slow: 'rgba(74,170,255,.14)' };
    const chipCol = { fast: '#ff8c5a', medium: 'var(--game-gold)', slow: '#a4d8ec' };
    o.innerHTML = `
      <div style="font-size:20px;font-weight:900;color:var(--game-offwhite,#F5F7EF);">${name || ''}</div>
      ${hint ? `<div style="font-size:11px;font-weight:700;color:var(--game-muted);margin-top:2px;">${hint}</div>` : ''}
      ${chips.length ? `<div style="display:flex;gap:6px;justify-content:center;margin-top:6px;">${chips.map(c => `<span style="font-size:9px;padding:3px 9px;border-radius:99px;background:${chipBg[c.kind] || 'rgba(255,255,255,.06)'};color:${chipCol[c.kind] || 'var(--game-muted)'};border:1px solid currentColor;">${c.label}</span>`).join('')}</div>` : ''}`;
    o.style.display = 'block';
    clearTimeout(this._briefTimer);
    this._briefTimer = setTimeout(() => this.hideTVBallBrief(), 1700);
  }
  hideTVBallBrief() { const o = document.getElementById('fw-tv-ballbrief'); if (o) o.style.display = 'none'; }

  /** TV training guide — "Where To Shoot" eyebrow + shot name + direction. */
  renderTVTrainGuide({ shot, dir } = {}) {
    const o = this._overlay('fw-tv-trainguide', 9360, 'radial-gradient(ellipse at 50% 50%, var(--game-secondary-06), #060a14 70%)');
    o.innerHTML = `
      <div style="text-align:center;padding:30px;">
        <div style="display:inline-block;font-size:12px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:var(--game-accent);padding:6px 16px;border:1.5px solid var(--game-accent-40);border-radius:99px;">Where To Shoot</div>
        <div style="font-size:clamp(32px,5vw,52px);font-weight:900;color:var(--game-gold);margin-top:18px;">${shot || ''}</div>
        ${dir ? `<div style="font-size:16px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--game-muted);margin-top:8px;">${dir}</div>` : ''}
      </div>`;
    o.style.display = 'flex';
  }
  renderTVTrainComplete({ message } = {}) {
    const o = this._overlay('fw-tv-trainguide', 9360, 'radial-gradient(ellipse at 50% 50%, var(--game-secondary-10), #060a14 70%)');
    o.innerHTML = `<div style="text-align:center;padding:30px;">
      <div style="font-size:72px;">✅</div>
      <div style="font-size:26px;font-weight:900;color:var(--game-accent);margin-top:10px;">${message || 'Training complete!'}</div></div>`;
    o.style.display = 'flex';
  }
  hideTVTrainGuide() { const o = document.getElementById('fw-tv-trainguide'); if (o) o.style.display = 'none'; }

  /** Shared full-screen overlay host factory (id + z-index + background). */
  _overlay(id, z, bg) {
    let o = document.getElementById(id);
    if (!o) {
      o = document.createElement('div');
      o.id = id;
      o.style.cssText = `position:fixed;inset:0;z-index:${z};display:none;align-items:center;justify-content:center;background:${bg};`;
      document.body.appendChild(o);
    }
    return o;
  }
}

if (typeof window !== 'undefined') {
  window.FrameworkTemplates = new GameTemplates();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.FrameworkTemplates;
}
