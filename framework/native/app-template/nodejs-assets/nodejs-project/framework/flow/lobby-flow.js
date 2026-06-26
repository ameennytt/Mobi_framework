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
  let cfg = null, game = null, R = null, flow = null, onLaunch = null;
  const S = {};
  const ROOT_ID = 'fw-flow-root';
  const storeKey = () => `${(game && game._gid) || 'fw'}_lobby_partial`;

  // Default flow = the chase journey, so a config without `flow` still works.
  const DEFAULT_FLOW = [
    { type: 'pair' },
    { type: 'choice', key: 'mode', title: 'Pick your mode', source: 'modes', branch: true },
    { type: 'choice', key: 'team', title: 'Pick your team', source: 'teams', when: { key: 'branch', equals: 'team' } },
    { type: 'choice', key: 'team', title: 'Pick your team', source: 'chaseData.cup', when: { key: 'branch', equals: 'cup' } },
    { type: 'choice', key: 'league', title: 'Pick your league', source: 'chaseData.leagues', when: { key: 'branch', equals: 'league' } },
    { type: 'choice', key: 'team', title: 'Pick your club', source: '$league.teams', when: { key: 'branch', equals: 'league' } },
    { type: 'choice', key: 'format', title: 'Pick your format', source: 'formats' },
    { type: 'choice', key: 'difficulty', title: 'Pick your challenge', source: 'difficulties' },
    { type: 'ceremony', kind: 'toss' },
    { type: 'target' },
  ];

  // ── html helpers ─────────────────────────────────────────────────────────
  const esc = (s) => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  function gridHtml(items, cls) {
    return `<div class="fw-grid">${items.map(it => `
      <button class="fw-card ${cls || ''}" data-id="${esc(it.id)}">
        ${it.color ? `<span class="fw-dot" style="background:${esc(it.color)}"></span>` : ''}
        <span class="fw-card-title">${esc(it.title)}</span>
        ${it.sub ? `<span class="fw-card-sub">${esc(it.sub)}</span>` : ''}
      </button>`).join('')}</div>`;
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
        return `<div class="fw-screen" id="${id}">
          <div class="fw-brand">${logo ? `<img src="${esc(logo)}" alt="">` : ''}
            <h1>${esc(title)}</h1><p>Pair with your TV to play</p></div>
          <div class="fw-spacer"></div>
          <div class="fw-cardbox">
            <label>Enter TV Code</label>
            <input type="text" id="fw-code" maxlength="6" placeholder="CODE" autocomplete="off">
            <button class="btn btn-primary fw-full" id="fw-connect">CONNECT</button>
            <div class="fw-status" id="fw-welcome-status"></div>
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
      if (host) host.innerHTML = headHtml(st.title, i, flow.length) + gridHtml(opts, cls);
    } else if (st.type === 'ceremony') {
      const msg = document.querySelector(`[data-msg="${i}"]`);
      if (msg) msg.textContent = st.kind === 'kickoff' ? 'Tap the ball to kick off' : 'Tap the coin';
    } else if (st.type === 'target' || st.type === 'briefing') {
      renderSummary(st, i);
    }
  }

  function renderSummary(st, i) {
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
    else if (key === 'team') { S.team = opt.title; S.teamShort = opt.short || String(opt.id).slice(0, 3).toUpperCase(); pickOpp(); }
    else if (key === 'league') { S.league = opt.title; S._leagueObj = opt._raw; }
    else if (key === 'format') { S.format = opt.id; if (opt.overs != null) S.overs = opt.overs; if (opt.rounds != null) S.rounds = opt.rounds; }
    else { S[key] = opt.id; }
    save();
  }
  function pickOpp() {
    const pool = (cfg.teams || []).filter(t => t.name !== S.team);
    const o = pool.length ? pool[(Math.random() * pool.length) | 0] : { name: 'Rivals', short: 'RIV' };
    S.opp = o.name; S.oppShort = o.short;
  }
  // A "quick" branch skips team screens — make sure a team + opponent still exist.
  function ensureTeam() {
    if (S.team) return;
    const t = (cfg.teams || [])[(Math.random() * (cfg.teams || []).length) | 0];
    if (t) { S.team = t.name; S.teamShort = t.short; pickOpp(); }
  }

  // ── ceremony ──────────────────────────────────────────────────────────
  function runCeremony(st, i) {
    const coin = document.querySelector(`.fw-coin[data-step="${i}"]`);
    const msg = document.querySelector(`[data-msg="${i}"]`);
    if (!coin || coin.classList.contains('spin')) return;
    coin.classList.add('spin');
    ensureTeam();
    if (st.kind === 'toss') {
      msg.textContent = 'Tossing…';
      setTimeout(() => {
        buildTarget();
        msg.textContent = `${S.opp || 'Opponent'} bats first — you chase!`;
        setTimeout(() => { coin.classList.remove('spin'); next(); }, 1200);
      }, 1500);
    } else {
      msg.textContent = 'Kick off!';
      setTimeout(() => { coin.classList.remove('spin'); next(); }, 1100);
    }
  }
  function buildTarget() {
    const overs = S.overs || 2;
    const rate = S.difficulty === 'hard' ? 11 : S.difficulty === 'easy' ? 6 : 8.5;
    const variance = (Math.random() * 2 - 1) * 1.5;
    S.cpu = Math.max(8, Math.round(overs * (rate + variance)));
    S.target = S.cpu + 1;
    save();
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
        next();
      }, true);
    }
    const cbtn = document.getElementById('fw-connect');
    if (cbtn) cbtn.onclick = connect;
    if (codeInput) codeInput.addEventListener('keydown', e => { if (e.key === 'Enter') connect(); });
    if (window.__roomCode && codeInput) { codeInput.value = window.__roomCode; connect(); }

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
