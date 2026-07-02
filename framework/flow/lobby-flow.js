'use strict';

/**
 * FrameworkFlow — the reusable phone lobby flow, driven by a config `flow: [...]`.
 *
 * Instead of hard-coding cricket screens, the lobby is a list of steps declared in
 * game-config.json. The framework interprets them, so any sport turns screens on/off
 * with no flow code. Step types:
 *
 *   { type:'pair' }                                   welcome + TV code entry (first)
 *   { type:'choice', key, title, source, branch?, when? }   a card-pick screen
 *   { type:'ceremony', kind:'toss'|'kickoff' }        coin/whistle (toss sets target)
 *   { type:'target' } | { type:'briefing' }           summary + launch
 *
 * choice.source resolves to options: a config key ('teams','formats','modes',
 * 'difficulties'), a nested path ('chaseData.cup','chaseData.leagues'), or the
 * dynamic '$league.teams' (clubs of the league picked earlier). choice.branch:true
 * stores the chosen option's `branch` in S.branch; choice.when:{key,equals} shows a
 * step only when a prior pick matches (handles cup/league/team divergence).
 *
 * Navigation uses FrameworkRouter (back stack + hardware back); partial selection is
 * persisted via FrameworkStorage. At the end onLaunch(selection) fires.
 *
 * Usage (lobby.html):
 *   const game = await FrameworkGame.init({ role:'bat', autoConnect:false });
 *   FrameworkFlow.mount({ game, config, onLaunch: (sel) => { ... } });
 *
 * window.FrameworkFlow.
 */
window.FrameworkFlow = (function () {
  let cfg = null, game = null, R = null, flow = null, onLaunch = null, onCeremony = null, onStance = null;
  let introIdx = 0;
  const S = {};
  const ROOT_ID = 'fw-flow-root';
  const storeKey = () => `${(game && game._gid) || 'fw'}_lobby_partial`;

  // Neutral default flow (sport-agnostic) — used only when a config omits `flow`.
  // Real games declare their own `flow:[...]` (see games/chase, games/versus).
  const DEFAULT_FLOW = [
    { type: 'pair' },
    { type: 'briefing' },
  ];

  // ── html helpers ─────────────────────────────────────────────────────────
  const esc = (s) => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  function gridHtml(items, cls) {
    const U = window.FrameworkUI;
    // Mode-hub cards = CricSwing .menu-card: vertical list rows with a 52px icon box,
    // title + description and a chevron. `accent:'match'|'practice'` recolours a card.
    if (cls && cls.indexOf('fw-mode') !== -1) {
      return `<div class="fw-menu-list">${items.map(it => {
        const acc = it.accent ? ` ${esc(it.accent)}` : '';
        const lock = it.locked ? ' locked' : '';
        const icoContent = it.iconUrl
          ? `<img src="${esc(it.iconUrl)}" alt="" width="44" height="44" decoding="async">`
          : (it.icon ? it.icon : (it.emoji || ''));
        return `<button class="fw-menu-card${acc}${lock}" data-id="${esc(it.id)}"${it.locked ? ' data-locked="1"' : ''}>
          <span class="fw-mc-ico">${icoContent}</span>
          <span class="fw-mc-text">
            <span class="fw-mc-title">${esc(it.title || it.name)}</span>
            ${it.sub ? `<span class="fw-mc-desc">${esc(it.sub)}</span>` : ''}
          </span>
          <span class="fw-mc-chev">›</span>
        </button>`;
      }).join('')}</div>`;
    }
    // League rows = CricSwing .league-row: flag + country + league name + "N cities" + arrow.
    if (cls && cls.indexOf('fw-rows') !== -1) {
      return `<div class="fw-league-list">${items.map(it => {
        const code = it.code || String(it.title || '').slice(0, 3).toUpperCase();
        const flagBg = it.color ? `background:${esc(it.color)}` : '';
        return `<button class="fw-league-row" data-id="${esc(it.id)}">
          <span class="fw-lr-flag" style="${flagBg}">${esc(code)}</span>
          <span class="fw-lr-body">
            <span class="fw-lr-title">${esc(it.title || it.name)}</span>
            ${it.sub ? `<span class="fw-lr-sub">${esc(it.sub)}</span>` : ''}
            ${it.count ? `<span class="fw-lr-count">${esc(it.count)}</span>` : ''}
          </span>
          <span class="fw-lr-arrow">›</span>
        </button>`;
      }).join('')}</div>`;
    }
    // Tiles = CricSwing .country-tile: 2-col grid, flag + name + sub ("Team").
    if (cls && cls.indexOf('fw-tile') !== -1) {
      return `<div class="fw-tile-grid">${items.map(it => {
        const code = it.code || String(it.title || '').slice(0, 3).toUpperCase();
        const flagBg = it.color ? `background:${esc(it.color)}` : '';
        return `<button class="fw-tile" data-id="${esc(it.id)}">
          <span class="fw-tile-flag" style="${flagBg}">${esc(code)}</span>
          <span class="fw-tile-name">${esc(it.title || it.name)}</span>
          <span class="fw-tile-sub">${esc(it.sub || 'Team')}</span>
        </button>`;
      }).join('')}</div>`;
    }
    return `<div class="fw-grid">${items.map(it => {
      // entity cards (teams/clubs/countries) get a painted crest; others a colour dot
      const badge = (it.short && U && U.crest)
        ? U.crest({ short: it.short, color: it.color, size: 44 })
        : (it.color ? `<span class="fw-dot" style="background:${esc(it.color)}"></span>` : '');
      return `<button class="fw-card _${esc(it.id)} ${cls || ''}" data-id="${esc(it.id)}">
        ${badge}
        <span class="fw-card-title">${esc(it.title || it.name)}</span>
        ${it.sub ? `<span class="fw-card-sub">${esc(it.sub)}</span>` : ''}
      </button>`;
    }).join('')}</div>`;
  }
  // Wrap the last word of a title in an accent span (CricSwing "Pick your **mode**").
  function titleAccent(t) {
    const s = String(t || '').trim(); if (!s) return '';
    const m = s.match(/^(.*\s)(\S+)$/);
    return m ? `${esc(m[1])}<span class="fw-accent">${esc(m[2])}</span>` : `<span class="fw-accent">${esc(s)}</span>`;
  }
  function headHtml(title, kicker) {
    return `<div class="fw-flowhead">
      ${kicker !== false ? `<div class="fw-chip fw-step-pill"><span class="fw-chip-dot pulse"></span>${esc(kicker || 'Setup')}</div>` : ''}
      <h1 class="fw-h1">${titleAccent(title)}</h1></div>`;
  }
  // Context row (CricSwing format screen): shows the picked team/country + a "Change" chip
  // that jumps back to re-pick. st.context names the S key to display (e.g. 'team').
  function contextRowHtml(st) {
    const val = S[st.context];
    if (!val) return '';
    const label = S.branch === 'cup' ? 'COUNTRY' : (S.branch === 'league' ? 'CLUB' : 'TEAM');
    return `<div class="fw-context">
      <div class="fw-context-sub">${esc(val)}</div>
      <div class="fw-context-row">
        <span class="fw-context-chip">${esc(val)}</span>
        <button class="fw-context-change" data-changectx>Change ${esc(label)} ›</button>
      </div></div>`;
  }

  // ── source resolution → normalized option list ─────────────────────────────
  function dig(path) {
    return path.split('.').reduce((o, k) => (o == null ? o : o[k]), cfg);
  }
  function resolveSource(src) {
    if (src === '$league.teams') {
      const lg = S._leagueObj || {};
      const t = lg.teams || [];
      // Cities inherit the league's flag colour; code = first 3 letters (CricSwing city tiles).
      return t.map(x => ({ id: x, title: x, color: lg.color, code: String(x).slice(0, 3).toUpperCase(), sub: 'Team' }));
    }
    let raw;
    if (src === 'modes') raw = cfg.modes;
    else if (src === 'teams') raw = cfg.teams;
    else if (src === 'formats') raw = cfg.formats;
    else if (src === 'difficulties') raw = cfg.difficulties;
    else raw = dig(src);
    raw = raw || [];
    return raw.map((x, i) => {
      if (typeof x === 'string') return { id: x, title: x };
      // object — map common shapes
      return {
        id: x.id != null ? x.id : (x.short || x.name || String(i)),
        title: x.title || x.name || String(x.id || i),
        sub: x.sub || x.leagueName,
        count: Array.isArray(x.teams) ? `${x.teams.length} cities` : undefined,
        color: x.color,
        code: x.code,
        branch: x.branch,
        overs: x.overs,
        rounds: x.rounds,
        short: x.short,
        iconUrl: x.iconUrl,
        accent: x.accent,
        emoji: x.emoji,
        icon: x.icon,
        locked: x.locked,
        _raw: x,
      };
    });
  }

  // ── DOM build ───────────────────────────────────────────────────────────
  function idFor(i) { return `fw-step-${i}`; }
  function buildDom() {
    let host = document.getElementById(ROOT_ID);
    if (!host) { host = document.createElement('div'); host.id = ROOT_ID; document.body.appendChild(host); }
    const title = (cfg.text && cfg.text.APP_TITLE) || 'Game';
    const logo = (cfg.assets && cfg.assets.APP_LOGO) || '';

    host.innerHTML = flow.map((st, i) => {
      const id = idFor(i);
      if (st.type === 'pair') {
        // CricSwing-fidelity pair screen: hero logo, pulse status chip, 4 animated
        // code-boxes (mirror a hidden real input), Wi-Fi hint. Visual boxes come from
        // FrameworkUI.codeInput; the hidden #fw-code keeps connect/auto-pair logic intact.
        const boxes = (window.FrameworkUI && window.FrameworkUI.codeInput)
          ? window.FrameworkUI.codeInput({ n: 4 })
          : '<div class="fw-codebox-row"></div>';
        const siteUrl = (st.siteUrl) || ((cfg.pair && cfg.pair.siteUrl)) || '';
        const siteLabel = siteUrl || (title + '.com');
        const iconUrl = (cfg.assets && cfg.assets.APP_ICON) || (cfg.assets && cfg.assets.APP_LOGO) || logo;
        return `<div class="fw-screen" id="${id}">
          <div class="fw-chip fw-pair-chip" id="fw-pair-chip"><span class="fw-chip-dot pulse"></span><span id="fw-pair-status">LOOKING FOR TV</span></div>
          <div class="fw-brand fw-hero">
            ${iconUrl ? `<img src="${esc(iconUrl)}" alt="">` : ''}
            <h1>${(cfg.text && cfg.text.APP_TITLE_HTML) || esc(title)}</h1>
          </div>
          <div class="fw-pair-steps">
            <div class="fw-pair-step">
              <span class="fw-pair-stepnum">1</span>
              <span class="fw-pair-stepicon">🖥️</span>
              <span class="fw-pair-steptext">Open <span class="fw-pair-site">${esc(siteLabel)}</span> on your TV</span>
            </div>
            <div class="fw-pair-step">
              <span class="fw-pair-stepnum">2</span>
              <span class="fw-pair-stepicon">🔢</span>
              <span class="fw-pair-steptext">A 4-digit code appears on screen<br><span style="font-size:12px;color:var(--game-muted);">Enter it in the field below to connect ↓</span></span>
            </div>
          </div>
          <div class="fw-code-frame" id="fw-code-frame">
            <div class="fw-code-header"><span class="lbl">Enter TV code</span><span class="step">Step 2</span></div>
            <div id="fw-code-visual" tabindex="0">${boxes}</div>
            <input type="text" id="fw-code" maxlength="4" inputmode="latin" autocomplete="off"
              autocapitalize="characters" style="position:absolute;opacity:0;pointer-events:none;height:0;width:0;">
          </div>
          <button class="btn btn-primary fw-full" id="fw-connect">Connect to TV</button>
          <button class="btn btn-secondary fw-full" id="fw-clear">Clear</button>
          <div class="fw-status" id="fw-welcome-status"></div>
          <div class="fw-spacer"></div></div>`;
      }
      // consent — one-time data-consent gate. Screen is empty; renderStep shows a modal.
      if (st.type === 'consent') {
        return `<div class="fw-screen" id="${id}"></div>`;
      }
      // intro — N-slide onboarding carousel. Slides from st.slides or ui.onboarding.intro.
      if (st.type === 'intro') {
        const eyebrow = st.eyebrow || (((cfg.ui && cfg.ui.onboarding) || {}).introEyebrow) || 'Quick Intro';
        return `<div class="fw-screen fw-intro" id="${id}">
          <div class="fw-chip fw-intro-chip"><span class="fw-chip-dot pulse"></span>${esc(eyebrow)}</div>
          <h2 class="fw-intro-title" data-introtitle="${i}"></h2>
          <div class="fw-spacer"></div>
          <div class="fw-intro-stage" data-introart="${i}"></div>
          <div class="fw-spacer"></div>
          <div class="fw-intro-caption" data-introcap="${i}"></div>
          <div class="fw-intro-dots" data-introdots="${i}"></div>
          <div class="fw-intro-actions">
            <div class="fw-intro-nav-row">
              <button class="fw-intro-prev" data-introprev="${i}" style="display:none">← Prev</button>
              <button class="btn btn-primary fw-intro-next" data-intronext="${i}">Next</button>
            </div>
            <button class="fw-intro-skip" data-introskip="${i}">Skip</button>
          </div></div>`;
      }
      // menu — mode hub: paired chip + title/sub, mode cards + optional About/Help entries.
      if (st.type === 'menu') {
        const chipLabel = st.kicker || 'TV Paired';
        return `<div class="fw-screen" id="${id}">
          <div class="fw-chip fw-step-pill fw-menu-paired"><span class="fw-chip-dot pulse"></span>${esc(chipLabel)}</div>
          <h1 class="fw-menu-title">${titleAccent(st.title || 'Pick your mode')}</h1>
          ${st.sub ? `<p class="fw-menu-sub">${esc(st.sub)}</p>` : ''}
          <div class="fw-grid-host" data-step="${i}"></div>
          <div class="fw-menu-entries" data-entries="${i}"></div></div>`;
      }
      if (st.type === 'choice') {
        // Optional CricSwing-style extras: a VS match-preview card + a "Start" confirm
        // button (so the pick doesn't auto-advance). Both gated by step flags.
        return `<div class="fw-screen" id="${id}">
          <div class="fw-grid-host" data-step="${i}"></div>
          ${st.preview ? `<div class="fw-preview" data-preview="${i}"></div>` : ''}
          ${st.confirm ? `<div class="fw-spacer"></div><button class="btn btn-primary fw-full fw-big fw-confirm" data-confirm="${i}" disabled>${esc(st.confirmText || 'Start Match')}</button>` : ''}
        </div>`;
      }
      if (st.type === 'ceremony') {
        const isToss = st.kind !== 'kickoff';
        const emoji = isToss ? '🪙' : '⚽';
        const sub = isToss ? 'Time for the toss' : 'Time to kick off';
        const coinCls = isToss ? 'fw-coin fw-coin-disc' : 'fw-coin';   // toss = styled gold disc
        return `<div class="fw-screen" id="${id}">
          ${headHtml(isToss ? 'Flip the coin' : 'Kick off', st.kicker !== undefined ? st.kicker : false)}
          <div class="fw-toss">
            <div class="fw-toss-sub">${sub}</div>
            <div class="${coinCls}" data-step="${i}">${emoji}</div>
            <div class="fw-toss-msg" data-msg="${i}">Tap to start</div>
            <div class="fw-toss-result" data-result="${i}"></div></div></div>`;
      }
      if (st.type === 'stance') {
        return `<div class="fw-screen fw-stance-screen" id="${id}">
          <div class="fw-stance-title">Get Into Your <span class="fw-accent">Stance</span></div>
          <div class="fw-stance-sub">Hold the phone like a bat handle. The bat below tilts with you.</div>
          <div class="fw-hand-row">
            <button class="fw-hand-btn fw-hand-r active" data-hand="right">🏏 Right Hand</button>
            <button class="fw-hand-btn fw-hand-l" data-hand="left">Left Hand 🏏</button>
          </div>
          <span class="fw-stance-good" id="fw-stance-good-${i}">✓ Stance Good</span>
          <div class="fw-stance-stage">
            <svg class="fw-hand-grip" viewBox="0 0 280 260" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
              <path d="M 90 250 Q 60 200 70 150 Q 78 110 100 100 Q 118 92 116 78 Q 120 64 130 70"/>
              <path d="M 100 110 Q 110 116 118 112"/>
              <path d="M 110 90 Q 116 92 120 88"/>
              <path d="M 198 50 Q 218 42 212 25"/>
              <path d="M 202 80 Q 224 72 218 55"/>
              <path d="M 202 110 Q 224 102 218 85"/>
              <path d="M 200 140 Q 220 132 214 115"/>
              <path d="M 195 168 Q 211 160 207 145"/>
              <path d="M 195 50 Q 200 110 190 168"/>
              <path d="M 100 180 Q 130 200 160 200 Q 200 200 195 180"/>
              <path d="M 110 200 Q 124 232 130 260"/>
              <path d="M 190 200 Q 178 232 172 260"/>
              <path d="M 130 210 Q 160 215 190 210"/>
            </svg>
            <span class="fw-stance-ring-inner"></span>
            <div class="fw-stance-bat" id="fw-stance-bat-${i}">
              <svg viewBox="0 0 120 280" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                <defs>
                  <linearGradient id="fwBladeGrad${i}" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%"   stop-color="#9a6a32"/>
                    <stop offset="35%"  stop-color="#e8c896"/>
                    <stop offset="65%"  stop-color="#d4a574"/>
                    <stop offset="100%" stop-color="#7a4818"/>
                  </linearGradient>
                  <linearGradient id="fwHandleGrad${i}" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%"   stop-color="#1a0a05"/>
                    <stop offset="50%"  stop-color="#3a2010"/>
                    <stop offset="100%" stop-color="#1a0a05"/>
                  </linearGradient>
                </defs>
                <g opacity="0.82">
                  <rect x="26" y="12" width="67" height="6" rx="2" fill="#2a1a08"/>
                  <rect x="26" y="16" width="67" height="149" rx="5" fill="url(#fwBladeGrad${i})" stroke="#5a3818" stroke-width="1.4"/>
                  <rect x="55" y="42" width="10" height="117" rx="2" fill="rgba(154,223,107,0.32)"/>
                  <line x1="36" y1="21" x2="36" y2="161" stroke="rgba(80,40,15,.4)"  stroke-width="0.6"/>
                  <line x1="46" y1="21" x2="46" y2="161" stroke="rgba(80,40,15,.45)" stroke-width="0.6"/>
                  <line x1="60" y1="21" x2="60" y2="161" stroke="rgba(80,40,15,.55)" stroke-width="0.8"/>
                  <line x1="74" y1="21" x2="74" y2="161" stroke="rgba(80,40,15,.45)" stroke-width="0.6"/>
                  <line x1="84" y1="21" x2="84" y2="161" stroke="rgba(80,40,15,.4)"  stroke-width="0.6"/>
                  <polygon points="41,166 79,166 72,173 48,173" fill="#a87842"/>
                  <rect x="49" y="173" width="22" height="93" rx="3" fill="url(#fwHandleGrad${i})"/>
                  <line x1="49" y1="187" x2="71" y2="187" stroke="#000" stroke-width="1.2" opacity=".45"/>
                  <line x1="49" y1="203" x2="71" y2="203" stroke="#000" stroke-width="1.2" opacity=".45"/>
                  <line x1="49" y1="219" x2="71" y2="219" stroke="#000" stroke-width="1.2" opacity=".45"/>
                  <line x1="49" y1="235" x2="71" y2="235" stroke="#000" stroke-width="1.2" opacity=".45"/>
                  <line x1="49" y1="251" x2="71" y2="251" stroke="#000" stroke-width="1.2" opacity=".45"/>
                  <ellipse cx="60" cy="266" rx="11" ry="4" fill="#0a0502"/>
                </g>
              </svg>
            </div>
          </div>
          <div class="fw-tilt-strip">
            <span class="fw-tilt-marker" id="fw-tilt-marker-${i}"></span>
          </div>
          <button class="fw-stance-btn" data-stancelock="${i}">LOCK</button>
          <div class="fw-stance-hint">Tap when comfortable — this sets your grip.</div>
        </div>`;
      }
      // target / briefing
      return `<div class="fw-screen" id="${id}">
        <div class="fw-flowhead">
          <span class="fw-series-badge" data-series="${i}" style="display:none;"></span>
          <h1 class="fw-h1">${st.type === 'target' ? 'Your chase' : 'Match ready'}</h1></div>
        <div class="fw-target" data-sum="${i}"></div>
        <div class="fw-roster" data-roster="${i}"></div>
        <div class="fw-spacer"></div>
        <button class="btn btn-primary fw-full fw-big" data-launch="${i}">PLAY NOW</button>
        <div class="fw-spacer"></div></div>`;
    }).join('');
  }

  function registerRoutes() { flow.forEach((_, i) => R.registerRoute(idFor(i), idFor(i))); }

  // ── navigation ─────────────────────────────────────────────────────────
  function passes(st) { return !st.when || S[st.when.key] === st.when.equals; }
  // One-time screens (consent/intro) skip once the user has seen them, unless once:false.
  function skipSeen(st) {
    if (st.type === 'consent' && st.once !== false) return consentSeen();
    if (st.type === 'intro' && st.once !== false) return introSeen();
    if (st.type === 'stance') return !(cfg.supportsMotion);
    return false;
  }
  function currentIdx() {
    const a = document.querySelector('.fw-screen.active');
    return a ? flow.findIndex(( _, i) => idFor(i) === a.id) : -1;
  }
  function go(i) { renderStep(flow[i], i); R.show(idFor(i)); }
  function next() {
    let i = currentIdx() + 1;
    while (i < flow.length && (!passes(flow[i]) || skipSeen(flow[i]))) i++;
    if (i < flow.length) go(i);
  }

  // ── per-step render-on-enter (choice grids, ceremony reset, summaries) ─────
  function renderStep(st, i) {
    if (st.type === 'choice' || st.type === 'menu') {
      const src = st.source || (st.type === 'menu' ? 'modes' : st.source);
      const opts = resolveSource(src);
      // Per-step tile subtitle (e.g. "Test Nation" for cup countries, "Club" for cities).
      if (st.tileSub) opts.forEach(o => { if (!o.sub) o.sub = st.tileSub; });
      let cls = '';
      if (src === 'modes' || st.layout === 'list') cls = 'fw-mode';   // big-icon menu cards
      else if (st.layout === 'rows') cls = 'fw-rows';                 // league rows (flag+title+sub+count)
      else if (st.tile) cls = 'fw-tile';                              // country/city flag tiles
      // Mirror this pick screen to the TV (CricSwing-style: pill, title, options, wait chip).
      const noun = st.key || (st.type === 'menu' ? 'mode' : 'option');
      sendTV('choosing', {
        kicker: st.kicker || ('Pick your ' + noun).toUpperCase(),
        stepTitle: st.title || 'Choose',
        keyName: noun,
        options: opts.map(o => o.title).filter(Boolean),
      });
      const host = document.querySelector(`.fw-grid-host[data-step="${i}"]`);
      if (host) {
        // Tabbed picker: `tabs: '<field>'` groups options by that field (e.g. region)
        // and shows pill tabs above the grid. Generic — works for any sport's brackets.
        const U = window.FrameworkUI;
        if (st.tabs && U && U.tabs) {
          const byG = {}, groups = [];
          opts.forEach(o => { const g = (o._raw && o._raw[st.tabs]) || 'All'; if (!byG[g]) { byG[g] = []; groups.push(g); } byG[g].push(o); });
          let active = 0;
          const renderG = () => {
            host.innerHTML = headHtml(st.title, st.kicker) + U.tabs(groups, active) + gridHtml(byG[groups[active]], cls);
            host.querySelectorAll('[data-tab]').forEach(b => { b.onclick = () => { active = +b.getAttribute('data-tab'); renderG(); }; });
          };
          renderG();
        } else {
          // menu shows its own chip+title header (in the screen template); choice uses headHtml.
          const head = st.type === 'menu' ? '' : headHtml(st.title, st.kicker);
          const ctx = st.context ? contextRowHtml(st) : '';
          host.innerHTML = head + ctx + gridHtml(opts, cls);
        }
        // Optional N-column layout (e.g. 3-across difficulty cards).
        if (st.cols) { const g = host.querySelector('.fw-grid'); if (g) g.classList.add(`cols-${st.cols}`); }
        if (st.center) { const g = host.querySelector('.fw-grid'); if (g) g.classList.add('fw-grid-center'); }
      }
      if (st.type === 'menu') renderMenuEntries(st, i);
      if (st.type === 'choice' && st.preview) renderPreview(i);
    } else if (st.type === 'consent') {
      renderConsent(st, i);
    } else if (st.type === 'intro') {
      introIdx = 0; renderIntro(st, i);
    } else if (st.type === 'ceremony') {
      const msg = document.querySelector(`[data-msg="${i}"]`);
      if (msg) msg.textContent = st.kind === 'kickoff' ? 'Tap the ball to kick off' : 'Tap the coin';
      const res = document.querySelector(`[data-result="${i}"]`);
      if (res) res.textContent = '';
      // Block the coin for 400ms so ghost/bleed taps from the previous step don't auto-fire the ceremony.
      const coinEl = document.querySelector(`.fw-coin[data-step="${i}"]`);
      if (coinEl) { coinEl.dataset.ready = '0'; setTimeout(() => { coinEl.dataset.ready = '1'; }, 400); }
      sendTV('ceremony', { kind: st.kind });   // mirror the coin/ball screen to the TV on enter
    } else if (st.type === 'stance') {
      // gyroscope wiring is game-provided; framework just wires hand buttons + LOCK
      const good = document.getElementById(`fw-stance-good-${i}`);
      const screen = document.getElementById(idFor(i));
      if (screen) {
        screen.querySelectorAll('.fw-hand-btn').forEach(b => {
          b.onclick = () => {
            screen.querySelectorAll('.fw-hand-btn').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            S._stanceHand = b.getAttribute('data-hand');
          };
        });
      }
    } else if (st.type === 'target' || st.type === 'briefing') {
      renderSummary(st, i);
    }
  }

  // ── consent / intro / menu helpers (all optional) ──────────────────────────
  function consentSeen() { try { return !!(window.FrameworkStorage && window.FrameworkStorage.load(`${game._gid}_consent`)); } catch (_) { return false; } }
  function renderConsent(st, i) {
    const ui = (cfg.ui && cfg.ui.onboarding) || {};
    const c = (typeof st.consent === 'object' ? st.consent : ui.consent) || {};
    if (!window.FrameworkUI || !window.FrameworkUI.showConfirmDialog) { next(); return; }
    window.FrameworkUI.showConfirmDialog({
      title: c.title || 'Help improve the game?',
      body: c.body || 'Allow anonymous gameplay data to be collected (no name, no email).',
      confirmText: c.acceptText || 'Allow',
      cancelText: c.declineText || 'No thanks',
      onConfirm: () => finishConsent(true),
      onCancel: () => finishConsent(false),
    });
  }
  function finishConsent(allowed) {
    try { window.FrameworkStorage && window.FrameworkStorage.save(`${game._gid}_consent`, allowed ? '1' : '0'); } catch (_) {}
    S._consent = allowed; next();
  }

  function introSeen() { try { return !!(window.FrameworkStorage && window.FrameworkStorage.load(`${game._gid}_intro_seen`)); } catch (_) { return false; } }
  function introSlides(st) { return (st.slides && st.slides.length) ? st.slides : (((cfg.ui && cfg.ui.onboarding) || {}).intro || []); }
  // Animated intro-stage art (CricSwing onboarding). Opt-in via slide.art; generic archetypes:
  //   'phone'  — a phone tilting like a bat/racket handle
  //   'timing' — a needle sweeping into a green timing zone
  //   'lock'   — a "lock my stance" calibration card
  function introArt(key) {
    if (key === 'phone') return `<div class="fw-intro-phone"><span class="fw-intro-phone-bat">🏏</span></div>`;
    if (key === 'timing') return `<div class="fw-intro-timing">
      <div class="fw-intro-timing-track"><div class="fw-intro-timing-zone"></div><div class="fw-intro-timing-needle"></div></div>
      <div class="fw-intro-timing-label">Green zone</div></div>`;
    if (key === 'lock') return `<div class="fw-intro-lock-card">
      <div class="fw-intro-lock-icon">🎯</div>
      <div class="fw-intro-lock-btn">Lock my stance</div>
      <div class="fw-intro-lock-hint">Calibrate once per match</div></div>`;
    return '';
  }
  function renderIntro(st, i) {
    const slides = introSlides(st);
    if (!slides.length) { next(); return; }
    const artHost = document.querySelector(`[data-introart="${i}"]`);
    const capHost = document.querySelector(`[data-introcap="${i}"]`);
    const titleHost = document.querySelector(`[data-introtitle="${i}"]`);
    const dotsHost = document.querySelector(`[data-introdots="${i}"]`);
    const nextBtn = document.querySelector(`[data-intronext="${i}"]`);
    const prevBtn = document.querySelector(`[data-introprev="${i}"]`);
    const sl = slides[Math.min(introIdx, slides.length - 1)];
    if (titleHost) titleHost.textContent = sl.title || '';
    // art: named archetype (sl.art) → animated stage; else fall back to an emoji icon.
    if (artHost) artHost.innerHTML = sl.art ? introArt(sl.art) : (sl.icon ? `<div class="fw-intro-icon">${sl.icon}</div>` : '');
    // caption is game-authored (trusted) → allow inline <b> highlight like the original.
    if (capHost) capHost.innerHTML = sl.text || sl.cap || '';
    if (dotsHost && window.FrameworkUI && window.FrameworkUI.dots) dotsHost.innerHTML = window.FrameworkUI.dots(slides.length, introIdx);
    if (nextBtn) nextBtn.textContent = (introIdx >= slides.length - 1) ? 'Start →' : 'Next →';
    if (prevBtn) prevBtn.style.display = introIdx > 0 ? '' : 'none';
  }
  function finishIntro() {
    try { window.FrameworkStorage && window.FrameworkStorage.save(`${game._gid}_intro_seen`, '1'); } catch (_) {}
    next();
  }

  function renderMenuEntries(st, i) {
    const host = document.querySelector(`[data-entries="${i}"]`);
    if (!host) return;
    const entries = st.entries || [];
    host.innerHTML = entries.map((e, j) =>
      `<button class="fw-menu-entry" data-entry="${j}">
        ${e.icon ? `<span class="fw-menu-entry-icon">${e.icon}</span>` : ''}
        <span class="fw-menu-entry-label">${esc(e.label || '')}</span>
        <span class="fw-menu-entry-chevron">›</span></button>`).join('');
  }
  function openInfoModal(which) {
    const ui = cfg.ui || {};
    const info = (which === 'help') ? ui.help : ui.about;
    if (!info || !window.FrameworkUI) return;
    window.FrameworkUI.showConfirmDialog({
      title: info.title || (which === 'help' ? 'How to Play' : 'About'),
      body: Array.isArray(info.body) ? info.body.map(p => `<p style="margin:0 0 10px;">${esc(p)}</p>`).join('') : esc(info.body || ''),
      confirmText: info.closeText || 'Close',
    });
  }
  function openSettings() {
    const items = (cfg.ui && cfg.ui.settings) || [];
    if (!window.FrameworkTemplates || !window.FrameworkTemplates.renderMobileSettings) return;
    window.FrameworkTemplates.renderMobileSettings({ title: 'Settings', items });
  }
  // A menu entry is a string action ('about'|'help'|'settings') or { action, branch }.
  // A `branch` entry behaves like picking that mode (jumps into the flow).
  function handleMenuEntry(ent) {
    const action = ent.action || ent;
    if (action === 'about') return openInfoModal('about');
    if (action === 'help') return openInfoModal('help');
    if (action === 'settings') return openSettings();
    if (ent.branch) { S.branch = ent.branch; if (ent.mode) S.mode = ent.mode; save(); sendTV('pick', { keyName: 'mode', picked: { id: ent.mode || ent.branch } }); next(); }
  }

  // Optional series/tournament: start it when a series-type format is picked, else clear.
  function applySeriesFromFormat(opt) {
    if (!window.FrameworkSeries) return;
    window.FrameworkSeries.init(game._gid);
    const raw = opt._raw || opt;
    const type = raw.seriesType || (cfg.series && cfg.series.type);
    if (type) {
      window.FrameworkSeries.start({
        type,
        bestOf: raw.bestOf || (cfg.series && cfg.series.bestOf) || 3,
        total: raw.total || (cfg.series && cfg.series.total),
      });
    } else {
      window.FrameworkSeries.clear();
    }
  }

  function renderSummary(st, i) {
    sendTV('ready');
    // Optional series/tournament badge ("Match 2 of 3").
    const badge = document.querySelector(`[data-series="${i}"]`);
    if (badge && window.FrameworkSeries) {
      const sd = window.FrameworkSeries.standings();
      if (sd && !sd.done) { badge.textContent = sd.label; badge.style.display = 'inline-block'; }
      else { badge.style.display = 'none'; }
    }
    const host = document.querySelector(`[data-sum="${i}"]`);
    if (host) {
      if (S.target) {
        host.innerHTML = `<div class="fw-target-row">${esc(S.opp || 'Opponent')} set <b id="fw-cpu-num">0</b></div>
          <div class="fw-target-big">Target <b>${S.target}</b></div>
          <div class="fw-target-sub">in ${S.overs || 0} over${(S.overs || 0) > 1 ? 's' : ''}</div>`;
        countUp(document.getElementById('fw-cpu-num'), S.cpu || 0);   // animated reveal
      } else {
        const len = S.rounds ? `${S.rounds} rounds` : (S.overs ? `${S.overs} overs` : 'Match');
        host.innerHTML = `<div class="fw-target-big"><b>${esc(S.team || 'You')}</b></div>
          <div class="fw-target-row">vs ${esc(S.opp || 'Opponent')}</div>
          <div class="fw-target-sub">${esc(len)}</div>`;
      }
    }
    // Optional editable roster / batting order (cfg.roster or S.roster).
    renderRoster(i);
  }

  // Animate a number from 0 → value (broadcast count-up). Pure setTimeout, no Date.
  function countUp(el, value) {
    if (!el) return;
    const target = Number(value) || 0;
    if (target <= 0) { el.textContent = '0'; return; }
    let n = 0; const steps = 22; const inc = Math.max(1, Math.ceil(target / steps));
    const tick = () => { n = Math.min(target, n + inc); el.textContent = n; if (n < target) setTimeout(tick, 32); };
    tick();
  }

  // Normalize roster config → { names, roles }. Config roster entries may be plain
  // strings or { name, role } objects; edited names live in S.roster (strings).
  function rosterModel() {
    const cfgRoster = (Array.isArray(cfg.roster) && cfg.roster.length) ? cfg.roster : null;
    const edited = (Array.isArray(S.roster) && S.roster.length) ? S.roster : null;
    if (!cfgRoster && !edited) return null;
    const base = cfgRoster || edited;
    const names = edited ? edited.slice() : base.map(x => (x && typeof x === 'object') ? (x.name || '') : x);
    const roles = (cfgRoster || []).map(x => (x && typeof x === 'object') ? (x.role || '') : '');
    return { names, roles };
  }
  function renderRoster(i) {
    const host = document.querySelector(`[data-roster="${i}"]`);
    if (!host) return;
    const m = rosterModel();
    if (!m) { host.innerHTML = ''; return; }
    if (window.FrameworkTemplates && window.FrameworkTemplates.renderMobileTeamEdit) {
      window.FrameworkTemplates.renderMobileTeamEdit(host, {
        title: cfg.rosterTitle || 'Your line-up', names: m.names, roles: m.roles,
        onChange: (list) => { S.roster = list; save(); },
      });
    }
  }

  // Optional match-preview card (CricSwing difficulty step): your team VS the opponent.
  function renderPreview(i) {
    const host = document.querySelector(`[data-preview="${i}"]`);
    if (!host) return;
    const U = window.FrameworkUI;
    const crest = (short, color, fallback) => (U && U.crest)
      ? U.crest({ short: short || String(fallback || '').slice(0, 3).toUpperCase(), color, size: 56 })
      : `<span class="fw-dot" style="background:${color || 'var(--game-accent)'}"></span>`;
    host.innerHTML = `<div class="fw-preview-label">Match Preview</div>
      <div class="fw-preview-row">
        <div class="fw-preview-team">${crest(S.teamShort, S.teamColor, S.team || 'You')}
          <div class="fw-preview-name">${esc(S.team || 'You')}</div>
          <span class="fw-preview-tag">Your Team</span></div>
        <div class="fw-preview-vs">VS</div>
        <div class="fw-preview-team">${crest(S.oppShort, S.oppColor, S.opp || 'CPU')}
          <div class="fw-preview-name">${esc(S.opp || 'Opponent')}</div></div>
      </div>`;
  }

  // ── picking ────────────────────────────────────────────────────────────
  function applyPick(st, opt) {
    const key = st.key;
    if (st.branch) S.branch = opt.branch || opt.id;
    if (key === 'mode') { S.mode = opt.id; }
    else if (key === 'team') { S.team = opt.title; S.teamShort = opt.short || opt.code || String(opt.id).slice(0, 3).toUpperCase(); S.teamColor = opt.color; pickOpp(st.source); }
    else if (key === 'league') { S.league = opt.title; S._leagueObj = opt._raw; }
    else if (key === 'format') { S.format = opt.id; S.formatName = opt.sub || opt.title; if (opt.overs != null) S.overs = opt.overs; if (opt.rounds != null) S.rounds = opt.rounds; applySeriesFromFormat(opt); }
    else { S[key] = opt.id; }
    save();
    // Self-describing pick: carry WHICH step and option were just chosen so the
    // TV can render the confirmation statelessly (matters for the screen_rejoined
    // rebroadcast, where lastTV is replayed without any prior context).
    sendTV('pick', { keyName: key, picked: { id: opt.id, title: opt.title, sub: opt.sub, short: opt.short, color: opt.color } });
  }
  // Opponent = another entry from the SAME pool the player picked from (CricSwing:
  // another country in the cup, another city in the league). Falls back to cfg.teams.
  function pickOpp(source) {
    let pool = [];
    try { pool = resolveSource(source || 'teams'); } catch (_) { pool = []; }
    pool = pool.filter(o => o.title !== S.team);
    if (!pool.length) pool = (cfg.teams || []).map(t => ({ title: t.name, short: t.short, color: t.color })).filter(o => o.title !== S.team);
    const o = pool.length ? pool[(Math.random() * pool.length) | 0] : { title: 'Rivals', short: 'RIV' };
    S.opp = o.title; S.oppShort = o.short || o.code || String(o.title).slice(0, 3).toUpperCase(); S.oppColor = o.color;
  }
  // A "quick" branch skips team screens — make sure a team + opponent still exist.
  function ensureTeam() {
    if (S.team) return;
    const t = (cfg.teams || [])[(Math.random() * (cfg.teams || []).length) | 0];
    if (t) { S.team = t.name; S.teamShort = t.short; S.teamColor = t.color; pickOpp('teams'); }
  }

  // ── ceremony ──────────────────────────────────────────────────────────
  // The framework knows nothing sport-specific here: it spins the coin/ball, then
  // (if the game supplied one) calls onCeremony(kind, S) to merge extra state — e.g.
  // the chase game computes a run target there. Returned { message } overrides the
  // settle text. No game hook → a plain "ready" with a generic message.
  function settleCeremony(st, coin, msg) {
    const extra = onCeremony ? onCeremony(st.kind, Object.assign({}, S)) : null;
    if (extra && typeof extra === 'object') { Object.assign(S, extra); save(); }
    const fallback = st.kind === 'toss' ? 'Ready!' : 'Kick off!';
    if (msg) msg.textContent = (extra && extra.message) || fallback;
    sendTV('ready');
    setTimeout(() => { coin.classList.remove('spin'); next(); }, st.kind === 'toss' ? 1200 : 1100);
  }
  function runCeremony(st, i) {
    const coin = document.querySelector(`.fw-coin[data-step="${i}"]`);
    const msg = document.querySelector(`[data-msg="${i}"]`);
    // Bail if coin not ready (ghost-tap guard) or already spinning.
    if (!coin || coin.classList.contains('spin') || coin.dataset.ready === '0') return;
    coin.classList.add('spin');
    ensureTeam();
    sendTV('ceremony', { kind: st.kind });
    if (st.kind === 'toss') {
      if (msg) msg.textContent = 'Tossing…';
      setTimeout(() => settleCeremony(st, coin, msg), 1500);
    } else {
      // Brief animation window before settling (mirrors toss UX; prevents instant-skip feel).
      if (msg) msg.textContent = 'Kicking off…';
      setTimeout(() => settleCeremony(st, coin, msg), 900);
    }
  }

  // ── TV setup mirror ───────────────────────────────────────────────────────
  // Relay each lobby step to the TV so the big screen mirrors setup (team / format
  // / kickoff / ready). The ephemeral bat connection stays open through the lobby,
  // and the server forwards bat→screen, so a plain game.send reaches screen.html,
  // where game.js shows it via FrameworkTemplates.showTVSetup. See the plan.
  let lastTV = null;
  function snapshot() {
    return {
      title: (cfg.text && cfg.text.APP_TITLE) || 'Game',
      team: S.team, teamShort: S.teamShort, teamColor: S.teamColor,
      opp: S.opp, oppShort: S.oppShort, oppColor: S.oppColor,
      format: S.format, formatName: S.formatName,
      rounds: S.rounds, overs: S.overs, target: S.target, cpu: S.cpu,
    };
  }
  function sendTV(phase, extra) {
    lastTV = Object.assign({ phase, selection: snapshot() }, extra || {});
    try { game && game.send && game.send('lobby_step', lastTV); } catch (_) {}
  }

  // ── wiring ─────────────────────────────────────────────────────────────
  function wire() {
    const host = document.getElementById(ROOT_ID);

    // pair (only one pair step assumed, first)
    const codeInput = document.getElementById('fw-code');
    const status = document.getElementById('fw-welcome-status');
    function connect() {
      const code = (codeInput.value || '').trim().toUpperCase();
      if (code.length < 4) { status.textContent = 'Enter the code shown on the TV'; return; }
      status.textContent = 'Connecting…';
      game.connect(code, () => {
        S.room = code;
        try { sessionStorage.setItem(`${game._gid}_room`, code); } catch (_) {}
        const chipStatus = document.getElementById('fw-pair-status');
        const chip = document.getElementById('fw-pair-chip');
        if (chipStatus) chipStatus.textContent = 'TV Paired!';
        if (chip) chip.classList.add('paired');
        if (window.FrameworkUI && window.FrameworkUI.setCode) window.FrameworkUI.setCode(code, true);
        next();
        sendTV('connected');
      }, true);
    }

    // If the TV reloads mid-setup it asks the phone to rebroadcast — re-push the
    // last setup state so the mirror restores instead of going blank.
    try {
      window.FrameworkEvents.on('screen_rejoined', () => {
        if (lastTV) { try { game.send('lobby_step', lastTV); } catch (_) {} }
      });
    } catch (_) {}
    const cbtn = document.getElementById('fw-connect');
    if (cbtn) cbtn.onclick = connect;
    const clrbtn = document.getElementById('fw-clear');
    if (clrbtn) clrbtn.onclick = () => {
      if (codeInput) { codeInput.value = ''; }
      if (window.FrameworkUI && window.FrameworkUI.setCode) window.FrameworkUI.setCode('');
      if (status) status.textContent = '';
    };
    if (codeInput) codeInput.addEventListener('keydown', e => { if (e.key === 'Enter') connect(); });

    // Mirror the hidden input into the visual 4 code-boxes; tapping the boxes focuses
    // the input (so the OS keyboard opens). Auto-connect once 4 chars are entered.
    const visual = document.getElementById('fw-code-visual');
    if (codeInput) {
      codeInput.addEventListener('input', () => {
        // Sanitize to up-to-4 upper A-Z0-9. Only rewrite value when it actually changed,
        // and always push the caret to the END afterwards — on Android WebView, reassigning
        // input.value resets the caret to index 0, so the next keystroke inserts at the
        // FRONT and the code comes out reordered. Keeping the caret at the end fixes that.
        const clean = (codeInput.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
        if (clean !== codeInput.value) codeInput.value = clean;
        try { codeInput.setSelectionRange(clean.length, clean.length); } catch (_) {}
        if (window.FrameworkUI && window.FrameworkUI.setCode) window.FrameworkUI.setCode(clean);
        if (clean.length === 4) connect();
      });
    }
    if (visual && codeInput) visual.addEventListener('click', () => codeInput.focus());

    // Native auto-pair (OPT-IN, default OFF). The RN shell injects window.__roomCode
    // once the TV creates a room; with `autoPair:true` in game-config.json the phone
    // skips typing and connects itself. DEFAULT is the manual experience: the player
    // looks at the TV, reads the code, and types it on the pair screen. Set
    // `"autoPair": true` in config only if you want the phone to pair automatically.
    let autoPaired = false;
    function autoPair() {
      if (!(cfg && cfg.autoPair)) return;                 // manual by default
      if (autoPaired || !window.__roomCode || !codeInput) return;
      // Only auto-pair while still on the pair step (don't yank a user mid-setup).
      if (currentIdx() > 0) return;
      autoPaired = true;
      codeInput.value = window.__roomCode;
      if (window.FrameworkUI && window.FrameworkUI.setCode) window.FrameworkUI.setCode(codeInput.value);
      connect();
    }
    autoPair();
    window.addEventListener('__roomCodeChanged', autoPair);

    // delegated: card picks, coin taps, intro nav, menu entries, launch
    host.addEventListener('click', (e) => {
      const card = e.target.closest('.fw-card') || e.target.closest('.fw-menu-card')
        || e.target.closest('.fw-league-row') || e.target.closest('.fw-tile');
      if (card && card.getAttribute('data-locked')) return;   // locked mode (e.g. Featured Chase)
      // "Change country/club" chip on the format step → jump back to the team/league picker.
      const changeCtx = e.target.closest('[data-changectx]');
      if (changeCtx) {
        for (let j = 1; j < flow.length; j++) {
          const s = flow[j];
          if (s.type === 'choice' && (s.key === 'team' || s.key === 'league') && passes(s) && !skipSeen(s)) { go(j); break; }
        }
        return;
      }
      if (card) {
        const i = currentIdx(); const st = flow[i];
        const src = st.source || (st.type === 'menu' ? 'modes' : st.source);
        const opt = resolveSource(src).find(o => String(o.id) === card.getAttribute('data-id'));
        if (!opt) return;
        applyPick(st, opt);
        if (st.confirm) {
          // CricSwing-style: tapping a card selects it; a Start button advances.
          const hostEl = document.getElementById(idFor(i));
          if (hostEl) hostEl.querySelectorAll('.fw-card').forEach(c => c.classList.toggle('selected', c === card));
          const start = document.querySelector(`[data-confirm="${i}"]`);
          if (start) start.disabled = false;
          if (st.preview) renderPreview(i);
        } else {
          next();
        }
        return;
      }
      // Start/confirm button on a choice step (only enabled once a card is picked).
      const conf = e.target.closest('[data-confirm]');
      if (conf) { if (!conf.disabled) next(); return; }
      // intro carousel: Next advances the slide (or finishes on the last), Skip ends it.
      const inext = e.target.closest('[data-intronext]');
      if (inext) {
        const i = currentIdx(); const slides = introSlides(flow[i]);
        if (introIdx >= slides.length - 1) finishIntro();
        else { introIdx++; renderIntro(flow[i], i); }
        return;
      }
      const iprev = e.target.closest('[data-introprev]');
      if (iprev) {
        const i = currentIdx();
        if (introIdx > 0) { introIdx--; renderIntro(flow[i], i); }
        return;
      }
      const iskip = e.target.closest('[data-introskip]');
      if (iskip) { finishIntro(); return; }
      // menu secondary entries (About / Help / Settings / custom).
      const entry = e.target.closest('[data-entry]');
      if (entry) {
        const i = currentIdx(); const st = flow[i];
        const ent = (st.entries || [])[+entry.getAttribute('data-entry')];
        if (ent) handleMenuEntry(ent);
        return;
      }
      const coin = e.target.closest('.fw-coin');
      if (coin) { runCeremony(flow[currentIdx()], currentIdx()); return; }
      const stanceLock = e.target.closest('[data-stancelock]');
      if (stanceLock) {
        const i = +stanceLock.getAttribute('data-stancelock');
        stanceLock.textContent = '✓ LOCKED';
        stanceLock.classList.add('done');
        if (onStance) onStance(S._stanceHand || 'right', () => next());
        else setTimeout(() => next(), 600);
        return;
      }
      const launch = e.target.closest('[data-launch]');
      if (launch) {
        ensureTeam(); save();
        // New match → drop any stale resume snapshot so the TV starts fresh (not resume).
        try { window.FrameworkStorage && window.FrameworkStorage.remove('framework_game_state'); } catch (_) {}
        onLaunch(Object.assign({}, S));
      }
    });
  }

  // ── persistence ───────────────────────────────────────────────────────
  // Mirror the lobby's partial picks to localStorage too, so an app-kill mid-setup
  // doesn't lose them (monitor the per-game key).
  function save() {
    try {
      if (window.FrameworkStorage) {
        window.FrameworkStorage.monitor(storeKey());
        window.FrameworkStorage.save(storeKey(), JSON.stringify(S));
      }
    } catch (_) {}
  }
  function hydrate() {
    try { const raw = window.FrameworkStorage && window.FrameworkStorage.load(storeKey()); if (raw) Object.assign(S, JSON.parse(raw)); } catch (_) {}
  }

  function mount(options) {
    cfg = options.config || {};
    game = options.game;
    onLaunch = options.onLaunch || function () {};
    onCeremony = typeof options.onCeremony === 'function' ? options.onCeremony : null;
    onStance = typeof options.onStance === 'function' ? options.onStance : null;
    if (!game._gid) { const p = location.pathname.split('/'); const idx = p.indexOf('games'); game._gid = (idx !== -1 && p[idx + 1]) ? p[idx + 1] : 'fw'; }
    R = window.FrameworkRouter;
    flow = (cfg.flow && cfg.flow.length) ? cfg.flow : DEFAULT_FLOW;
    buildDom();
    registerRoutes();
    wire();
    hydrate();
    R.resetTo(idFor(0));
    maybeOfferResume();
  }

  // If a match is mid-flight (the controller left the in-match flag), offer to resume it
  // instead of walking the whole lobby again. Generic across games (key = `${gid}_inmatch`).
  function maybeOfferResume() {
    let inMatch = false, room = '';
    try {
      inMatch = !!sessionStorage.getItem(`${game._gid}_inmatch`);
      room = sessionStorage.getItem(`${game._gid}_room`) || '';
    } catch (_) {}
    if (!inMatch || !window.FrameworkUI || !window.FrameworkUI.showConfirmDialog) return;
    window.FrameworkUI.showConfirmDialog({
      title: 'Resume your match?',
      body: 'You have a match in progress.',
      confirmText: 'Resume',
      cancelText: 'New Game',
      onConfirm: () => { window.location.href = `/games/${game._gid}/controller.html${room ? `?room=${encodeURIComponent(room)}` : ''}`; },
      onCancel: () => { try { sessionStorage.removeItem(`${game._gid}_inmatch`); } catch (_) {} },
    });
  }

  return { mount, selection: () => Object.assign({}, S), go: (i) => go(i) };
})();
