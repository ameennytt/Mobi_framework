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
  let cfg = null, game = null, R = null, flow = null, onLaunch = null, onCeremony = null;
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
    return `<div class="fw-grid">${items.map(it => {
      // entity cards (teams/clubs/countries) get a painted crest; others a colour dot
      const badge = (it.short && U && U.crest)
        ? U.crest({ short: it.short, color: it.color, size: 44 })
        : (it.color ? `<span class="fw-dot" style="background:${esc(it.color)}"></span>` : '');
      return `<button class="fw-card ${cls || ''}" data-id="${esc(it.id)}">
        ${badge}
        <span class="fw-card-title">${esc(it.title)}</span>
        ${it.sub ? `<span class="fw-card-sub">${esc(it.sub)}</span>` : ''}
      </button>`;
    }).join('')}</div>`;
  }
  function headHtml(title, step, total) {
    return `<div class="fw-flowhead">
      ${step ? `<span class="fw-pill">Step ${step} / ${total}</span>` : ''}
      <h1 class="fw-h1">${esc(title)}</h1></div>`;
  }

  // ── source resolution → normalized option list ─────────────────────────────
  function dig(path) {
    return path.split('.').reduce((o, k) => (o == null ? o : o[k]), cfg);
  }
  function resolveSource(src) {
    if (src === '$league.teams') {
      const t = (S._leagueObj && S._leagueObj.teams) || [];
      return t.map(x => ({ id: x, title: x }));
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
        sub: x.sub,
        color: x.color,
        branch: x.branch,
        overs: x.overs,
        rounds: x.rounds,
        short: x.short,
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
        return `<div class="fw-screen" id="${id}">
          <div class="fw-spacer"></div>
          <div class="fw-brand fw-hero">${logo ? `<img src="${esc(logo)}" alt="">` : ''}
            <h1>${esc(title)}</h1><p>Pair with your TV to play</p></div>
          <div class="fw-pair-chip" id="fw-pair-chip"><span class="fw-pair-dot"></span><span id="fw-pair-status">Looking for TV…</span></div>
          <div class="fw-spacer"></div>
          <div class="fw-cardbox">
            <label>Enter TV Code</label>
            <div id="fw-code-visual" tabindex="0">${boxes}</div>
            <input type="text" id="fw-code" maxlength="4" inputmode="latin" autocomplete="off"
              autocapitalize="characters" style="position:absolute;opacity:0;pointer-events:none;height:0;width:0;">
            <button class="btn btn-primary fw-full" id="fw-connect">CONNECT</button>
            <div class="fw-status" id="fw-welcome-status"></div>
            <div class="fw-wifi-hint">📶 Phone &amp; TV must be on the <b>same Wi-Fi</b>.</div>
          </div>
          <div class="fw-spacer"></div></div>`;
      }
      if (st.type === 'choice') {
        return `<div class="fw-screen" id="${id}"><div class="fw-grid-host" data-step="${i}"></div></div>`;
      }
      if (st.type === 'ceremony') {
        const emoji = st.kind === 'kickoff' ? '⚽' : '🪙';
        return `<div class="fw-screen" id="${id}">
          ${headHtml(st.kind === 'kickoff' ? 'Kick off' : 'Flip the coin')}
          <div class="fw-toss"><div class="fw-coin" data-step="${i}">${emoji}</div>
          <div class="fw-toss-msg" data-msg="${i}">Tap to start</div></div></div>`;
      }
      // target / briefing
      return `<div class="fw-screen" id="${id}">
        <div class="fw-flowhead"><h1 class="fw-h1">${st.type === 'target' ? 'Your chase' : 'Match ready'}</h1></div>
        <div class="fw-target" data-sum="${i}"></div>
        <div class="fw-spacer"></div>
        <button class="btn btn-primary fw-full fw-big" data-launch="${i}">PLAY NOW</button>
        <div class="fw-spacer"></div></div>`;
    }).join('');
  }

  function registerRoutes() { flow.forEach((_, i) => R.registerRoute(idFor(i), idFor(i))); }

  // ── navigation ─────────────────────────────────────────────────────────
  function passes(st) { return !st.when || S[st.when.key] === st.when.equals; }
  function currentIdx() {
    const a = document.querySelector('.fw-screen.active');
    return a ? flow.findIndex(( _, i) => idFor(i) === a.id) : -1;
  }
  function go(i) { renderStep(flow[i], i); R.show(idFor(i)); }
  function next() {
    let i = currentIdx() + 1;
    while (i < flow.length && !passes(flow[i])) i++;
    if (i < flow.length) go(i);
  }

  // ── per-step render-on-enter (choice grids, ceremony reset, summaries) ─────
  function renderStep(st, i) {
    if (st.type === 'choice') {
      const opts = resolveSource(st.source);
      const cls = st.source === 'modes' ? 'fw-mode' : '';
      const host = document.querySelector(`.fw-grid-host[data-step="${i}"]`);
      if (!host) return;
      // Tabbed picker: `tabs: '<field>'` groups options by that field (e.g. region) and
      // shows pill tabs above the grid. Generic — works for any sport's groups/brackets.
      const U = window.FrameworkUI;
      if (st.tabs && U && U.tabs) {
        const byG = {}, groups = [];
        opts.forEach(o => { const g = (o._raw && o._raw[st.tabs]) || 'All'; if (!byG[g]) { byG[g] = []; groups.push(g); } byG[g].push(o); });
        let active = 0;
        const renderG = () => {
          host.innerHTML = headHtml(st.title, i, flow.length) + U.tabs(groups, active) + gridHtml(byG[groups[active]], cls);
          host.querySelectorAll('[data-tab]').forEach(b => { b.onclick = () => { active = +b.getAttribute('data-tab'); renderG(); }; });
        };
        renderG();
      } else {
        host.innerHTML = headHtml(st.title, i, flow.length) + gridHtml(opts, cls);
      }
    } else if (st.type === 'ceremony') {
      const msg = document.querySelector(`[data-msg="${i}"]`);
      if (msg) msg.textContent = st.kind === 'kickoff' ? 'Tap the ball to kick off' : 'Tap the coin';
    } else if (st.type === 'target' || st.type === 'briefing') {
      renderSummary(st, i);
    }
  }

  function renderSummary(st, i) {
    sendTV('ready');
    const host = document.querySelector(`[data-sum="${i}"]`);
    if (!host) return;
    if (S.target) {
      host.innerHTML = `<div class="fw-target-row">${esc(S.opp || 'Opponent')} set <b>${S.cpu}</b></div>
        <div class="fw-target-big">Target <b>${S.target}</b></div>
        <div class="fw-target-sub">in ${S.overs || 0} over${(S.overs || 0) > 1 ? 's' : ''}</div>`;
    } else {
      const len = S.rounds ? `${S.rounds} rounds` : (S.overs ? `${S.overs} overs` : 'Match');
      host.innerHTML = `<div class="fw-target-big"><b>${esc(S.team || 'You')}</b></div>
        <div class="fw-target-row">vs ${esc(S.opp || 'Opponent')}</div>
        <div class="fw-target-sub">${esc(len)}</div>`;
    }
  }

  // ── picking ────────────────────────────────────────────────────────────
  function applyPick(st, opt) {
    const key = st.key;
    if (st.branch) S.branch = opt.branch || opt.id;
    if (key === 'mode') { S.mode = opt.id; }
    else if (key === 'team') { S.team = opt.title; S.teamShort = opt.short || String(opt.id).slice(0, 3).toUpperCase(); S.teamColor = opt.color; pickOpp(); }
    else if (key === 'league') { S.league = opt.title; S._leagueObj = opt._raw; }
    else if (key === 'format') { S.format = opt.id; S.formatName = opt.sub || opt.title; if (opt.overs != null) S.overs = opt.overs; if (opt.rounds != null) S.rounds = opt.rounds; }
    else { S[key] = opt.id; }
    save();
    sendTV('pick');
  }
  function pickOpp() {
    const pool = (cfg.teams || []).filter(t => t.name !== S.team);
    const o = pool.length ? pool[(Math.random() * pool.length) | 0] : { name: 'Rivals', short: 'RIV' };
    S.opp = o.name; S.oppShort = o.short; S.oppColor = o.color;
  }
  // A "quick" branch skips team screens — make sure a team + opponent still exist.
  function ensureTeam() {
    if (S.team) return;
    const t = (cfg.teams || [])[(Math.random() * (cfg.teams || []).length) | 0];
    if (t) { S.team = t.name; S.teamShort = t.short; pickOpp(); }
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
    if (!coin || coin.classList.contains('spin')) return;
    coin.classList.add('spin');
    ensureTeam();
    sendTV('ceremony', { kind: st.kind });
    if (st.kind === 'toss') {
      if (msg) msg.textContent = 'Tossing…';
      setTimeout(() => settleCeremony(st, coin, msg), 1500);
    } else {
      settleCeremony(st, coin, msg);
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
    if (codeInput) codeInput.addEventListener('keydown', e => { if (e.key === 'Enter') connect(); });

    // Mirror the hidden input into the visual 4 code-boxes; tapping the boxes focuses
    // the input (so the OS keyboard opens). Auto-connect once 4 chars are entered.
    const visual = document.getElementById('fw-code-visual');
    if (codeInput) {
      codeInput.addEventListener('input', () => {
        codeInput.value = (codeInput.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
        if (window.FrameworkUI && window.FrameworkUI.setCode) window.FrameworkUI.setCode(codeInput.value);
        if (codeInput.value.length === 4) connect();
      });
    }
    if (visual && codeInput) visual.addEventListener('click', () => codeInput.focus());

    // Native auto-pair: the RN shell injects window.__roomCode once the TV creates a
    // room. It can arrive before OR after this lobby loads, so handle both: read it
    // now, and listen for the __roomCodeChanged event the shell fires on update.
    let autoPaired = false;
    function autoPair() {
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

    // delegated: card picks, coin taps, launch
    host.addEventListener('click', (e) => {
      const card = e.target.closest('.fw-card');
      if (card) {
        const i = currentIdx(); const st = flow[i];
        const opt = resolveSource(st.source).find(o => String(o.id) === card.getAttribute('data-id'));
        if (opt) { applyPick(st, opt); next(); }
        return;
      }
      const coin = e.target.closest('.fw-coin');
      if (coin) { runCeremony(flow[currentIdx()], currentIdx()); return; }
      const launch = e.target.closest('[data-launch]');
      if (launch) { ensureTeam(); save(); onLaunch(Object.assign({}, S)); }
    });
  }

  // ── persistence ───────────────────────────────────────────────────────
  function save() { try { window.FrameworkStorage && window.FrameworkStorage.save(storeKey(), JSON.stringify(S)); } catch (_) {} }
  function hydrate() {
    try { const raw = window.FrameworkStorage && window.FrameworkStorage.load(storeKey()); if (raw) Object.assign(S, JSON.parse(raw)); } catch (_) {}
  }

  function mount(options) {
    cfg = options.config || {};
    game = options.game;
    onLaunch = options.onLaunch || function () {};
    onCeremony = typeof options.onCeremony === 'function' ? options.onCeremony : null;
    if (!game._gid) { const p = location.pathname.split('/'); const idx = p.indexOf('games'); game._gid = (idx !== -1 && p[idx + 1]) ? p[idx + 1] : 'fw'; }
    R = window.FrameworkRouter;
    flow = (cfg.flow && cfg.flow.length) ? cfg.flow : DEFAULT_FLOW;
    buildDom();
    registerRoutes();
    wire();
    hydrate();
    R.resetTo(idFor(0));
  }

  return { mount, selection: () => Object.assign({}, S), go: (i) => go(i) };
})();
