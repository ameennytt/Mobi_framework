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
    const HB = 'background:rgba(7,16,12,.78);border:1.5px solid rgba(118,185,0,.30);backdrop-filter:blur(8px);box-shadow:var(--fw-shadow-card);border-radius:12px;';
    const SCORE = 'font-family:var(--game-mono);font-weight:900;color:var(--game-gold);line-height:1;text-shadow:0 0 .35em rgba(243,216,107,.45);';
    o.innerHTML = `
      <div style="position:absolute;top:28px;left:28px;${HB}padding:8px 16px;">
        <div style="font-size:12px;font-weight:800;letter-spacing:1px;color:var(--game-muted);text-transform:uppercase;">${title || ''}</div>
        <div style="display:flex;align-items:baseline;gap:10px;margin-top:2px;">
          <div id="fw-sb-score" style="${SCORE}font-size:44px;">0</div>
          <div id="fw-sb-over" style="font-family:var(--game-mono);font-size:16px;font-weight:700;color:var(--game-text);">0.0</div>
        </div>
      </div>
      <div style="position:absolute;left:50%;bottom:30px;transform:translateX(-50%);display:flex;gap:0;${HB}overflow:hidden;">
        <div style="padding:12px 22px;">
          <div style="font-size:11px;text-transform:uppercase;color:var(--game-muted);letter-spacing:1px;">${chasingLabel || 'Target'}</div>
          <div id="fw-sb-target" style="font-family:var(--game-mono);font-size:22px;font-weight:900;color:var(--game-text);">—</div>
        </div>
        <div style="padding:12px 22px;border-left:1px solid var(--fw-line);">
          <div style="font-size:11px;text-transform:uppercase;color:var(--game-muted);letter-spacing:1px;">Need</div>
          <div id="fw-sb-need" style="font-family:var(--game-mono);font-size:22px;font-weight:900;color:var(--game-accent);">—</div>
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
      <div style="position:absolute;top:26px;left:50%;transform:translateX(-50%);display:flex;align-items:stretch;background:rgba(7,16,12,.78);border:1.5px solid rgba(118,185,0,.30);backdrop-filter:blur(8px);border-radius:12px;overflow:hidden;box-shadow:var(--fw-shadow-card);">
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
      <div style="position:absolute;top:26px;left:50%;transform:translateX(-50%);display:flex;background:rgba(7,16,12,.78);border:1.5px solid rgba(118,185,0,.30);backdrop-filter:blur(8px);border-radius:12px;overflow:hidden;box-shadow:var(--fw-shadow-card);">
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

  /** Dispatcher — pick HUD by kind ('chase'|'versus'|'attempt'). */
  renderScorebar(kind, opts = {}) {
    if (kind === 'versus') return this.renderVersusScorebar(opts);
    if (kind === 'attempt') return this.renderAttemptScorebar(opts);
    return this.renderTVScorebar(opts);
  }
  updateScorebar(kind, state = {}) {
    if (kind === 'versus') return this.updateVersusScorebar(state);
    if (kind === 'attempt') return this.updateAttemptScorebar(state);
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
    o.innerHTML = `<div style="font-size:84px;font-weight:900;letter-spacing:2px;color:${color || '#ffd700'};text-shadow:0 6px 30px rgba(0,0,0,.6);">${text}</div>${sub ? `<div style="font-size:22px;font-weight:700;color:var(--game-text);margin-top:6px;">${sub}</div>` : ''}`;
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
      <div style="font-size:18px;font-weight:800;letter-spacing:.3em;text-transform:uppercase;color:${c};">${kicker || ''}</div>
      <div style="font-family:var(--game-mono);font-size:160px;font-weight:900;line-height:1;color:${c};text-shadow:0 10px 50px rgba(0,0,0,.6);animation:fwMiPop .6s var(--fw-ease-pop, ease-out);">${big != null ? big : ''}</div>
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
    const bannerBorder = loss ? 'rgba(122,32,32,.65)' : 'rgba(118,185,0,.45)';
    const bannerGlow = loss ? 'rgba(255,80,80,.14)' : 'rgba(126,219,126,.14)';
    const icon = opts.icon != null ? opts.icon : (loss ? '' : '🏆');

    // stats grid — JetBrains-mono gold values, uppercase muted labels (CricSwing .me-stat)
    const stats = (opts.stats || []).map(s => `
      <div style="background:rgba(0,0,0,.28);border-radius:11px;padding:12px 6px;text-align:center;">
        <div style="font-family:var(--game-mono);font-size:30px;font-weight:900;color:var(--game-gold);line-height:1;">${s.value}</div>
        <div style="font-size:10px;color:var(--game-muted);text-transform:uppercase;letter-spacing:.14em;margin-top:.45em;font-weight:700;">${s.label}</div>
      </div>`).join('');

    o.innerHTML = `
      <div style="width:min(92vw,820px);display:flex;flex-direction:column;gap:16px;padding:24px;">
        <div style="padding:18px 24px;border-radius:18px;text-align:center;background:${bannerBg};border:2px solid ${bannerBorder};box-shadow:0 18px 50px rgba(0,0,0,.55),0 0 90px ${bannerGlow} inset;animation:fwBannerIn .6s var(--fw-ease-out) both;">
          ${icon ? `<div style="font-size:54px;line-height:1;filter:drop-shadow(0 6px 20px rgba(255,215,0,.45));animation:fwPop .7s var(--fw-ease-pop) backwards;">${icon}</div>` : ''}
          <div style="font-size:20px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:${loss ? '#ff8866' : 'var(--game-accent)'};margin-top:6px;">${opts.bannerText || 'Match Over'}</div>
          ${opts.winner ? `<div style="font-family:var(--game-mono);font-size:52px;font-weight:900;color:var(--game-text);line-height:1.05;margin-top:6px;">${opts.winner}</div>` : ''}
          ${opts.sub ? `<div style="font-size:14px;color:var(--game-accent);font-weight:700;margin-top:6px;">${opts.sub}</div>` : ''}
        </div>
        ${opts.pom ? `<div style="display:flex;align-items:center;gap:14px;padding:14px 18px;border-radius:14px;text-align:left;background:rgba(7,16,12,.62);border:1.5px solid rgba(118,185,0,.28);">${opts.pom}</div>` : ''}
        ${stats ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:10px;">${stats}</div>` : ''}
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
    let o = document.getElementById('fw-tv-setup');
    if (!o) {
      o = document.createElement('div');
      o.id = 'fw-tv-setup';
      o.style.cssText = 'position:fixed;inset:0;z-index:9400;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 120%, rgba(255,255,255,.06), rgba(5,10,22,.94) 70%);';
      document.body.appendChild(o);
    }

    const dot = (c) => `<span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:${c || 'var(--game-accent)'};box-shadow:0 0 0 3px rgba(255,255,255,.12);vertical-align:middle;"></span>`;
    const lengthLine = s.formatName
      ? s.formatName
      : (s.rounds ? `${s.rounds} rounds` : (s.overs ? `${s.overs} overs` : ''));

    // Centre piece changes by phase.
    let centre = '';
    if (phase === 'ceremony') {
      const emoji = state.kind === 'toss' ? '🪙' : '⚽';
      const anim = state.kind === 'toss' ? 'fwCoinFlip 1.4s ease-in-out infinite' : 'fwBallKick 1.1s ease-in-out infinite';
      const label = state.kind === 'toss' ? 'Tossing…' : 'Kicking off…';
      centre = `<div style="font-size:120px;line-height:1;animation:${anim};filter:drop-shadow(0 12px 26px rgba(0,0,0,.5));">${emoji}</div>
        <div style="font-size:20px;font-weight:800;color:var(--game-text);margin-top:18px;">${label}</div>`;
    } else if (phase === 'ready') {
      const target = s.target
        ? `<div style="font-size:18px;color:var(--game-muted);margin-top:14px;">Target <b style="color:var(--game-accent);font-size:30px;">${s.target}</b>${s.overs ? ` in ${s.overs} over${s.overs > 1 ? 's' : ''}` : ''}</div>`
        : '';
      centre = `<div style="font-size:46px;font-weight:900;letter-spacing:2px;color:var(--game-accent);animation:fwPulse 1.1s ease-in-out infinite;">MATCH READY</div>${target}`;
    } else {
      centre = `<div style="font-size:22px;font-weight:700;color:var(--game-muted);">Choosing on the phone…</div>`;
    }

    // VS strip — shown once a team is picked.
    const vs = s.team ? `
      <div style="display:flex;align-items:center;justify-content:center;gap:26px;margin:6px 0 22px;">
        <div style="text-align:center;min-width:160px;">
          <div style="margin-bottom:8px;">${dot(s.teamColor)}</div>
          <div style="font-size:30px;font-weight:900;color:var(--game-text);">${s.team}</div>
          <div style="font-size:13px;color:var(--game-muted);text-transform:uppercase;letter-spacing:1px;">You</div>
        </div>
        <div style="font-size:26px;font-weight:900;color:var(--game-muted);">VS</div>
        <div style="text-align:center;min-width:160px;">
          <div style="margin-bottom:8px;">${dot(s.oppColor)}</div>
          <div style="font-size:30px;font-weight:900;color:var(--game-text);">${s.opp || 'Opponent'}</div>
          <div style="font-size:13px;color:var(--game-muted);text-transform:uppercase;letter-spacing:1px;">CPU</div>
        </div>
      </div>` : '';

    o.innerHTML = `
      <style>
        @keyframes fwBallKick { 0%,100%{ transform:translateY(0) rotate(0);} 50%{ transform:translateY(-26px) rotate(180deg);} }
        @keyframes fwCoinFlip { 0%,100%{ transform:rotateY(0) scale(1);} 50%{ transform:rotateY(900deg) scale(1.15);} }
        @keyframes fwPulse { 0%,100%{ transform:scale(1); opacity:1;} 50%{ transform:scale(1.06); opacity:.82;} }
      </style>
      <div style="text-align:center;max-width:820px;padding:40px;">
        <div style="font-size:16px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:var(--game-accent);margin-bottom:18px;">${s.title || ''}</div>
        ${vs}
        ${lengthLine ? `<div style="font-size:17px;font-weight:700;color:var(--game-text);margin-bottom:26px;">${lengthLine}</div>` : '<div style="height:18px;"></div>'}
        <div style="min-height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;">${centre}</div>
        <div style="font-size:14px;color:var(--game-muted);margin-top:24px;">Setting up on your phone…</div>
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
}

if (typeof window !== 'undefined') {
  window.FrameworkTemplates = new GameTemplates();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.FrameworkTemplates;
}
