'use strict';

/**
 * CricSwing TV lobby mirror — pixel-exact extraction from the original
 * cric-final screen.html (see games/cricswing/reference/screen-original.html).
 *
 * (a) renderLobbyMirror(m)  — verbatim port of the monolith's onLobbyState
 *     (source lines 6171-6372): same DOM, same template strings, same inline
 *     styles, byte-for-byte. Only monolith-system lines were dropped (csLog,
 *     room-overlay/main-menu, away/phase4 overlays, training flags) — those
 *     subsystems don't exist in the modular TV. One ADDITION: stage 'teamwait'
 *     reuses SETUP_WAITING for the plain team-branch choosing screen the
 *     monolith never had.
 * (b) mapStep(d)            — adapter: framework `lobby_step` dialect → the
 *     monolith's lobby_state stages (incl. toss flip + 3.5s target reveal).
 * (c) FrameworkTemplates.showTVSetup/hideTVSetup overrides (Level-2 override,
 *     DOC/OVERRIDES.md) + pairing-overlay churn guard (monolith tvInLobby
 *     parity, source 6376-6387).
 * (d) #conn-badge + boot parity (monolith 1576, 6077, 6377, 6942).
 *
 * Any visual difference vs the reference oracle is a migration defect.
 */
(function () {

  // ── module state ─────────────────────────────────────────────────────────
  let lastShown = null;    // logical screen id ('toss-ready', 'toss-flip', 'target', …)
  let modeChosen = false;  // monolith tvModeChosen parity (6069)
  let targetTimer = null;  // pending 3.5s flip→target reveal
  let flipAt = 0;          // when the flip started — anchors the target reveal

  function mirrorVisible() {
    const el = document.getElementById('lobby-mirror');
    return !!(el && el.style.display !== 'none' && el.innerHTML);
  }

  // ── (a) renderer — verbatim port of monolith onLobbyState 6171-6372 ──────
  function renderLobbyMirror(m) {
    let el = document.getElementById('lobby-mirror');
    if (!el) {
      el = document.createElement('div');
      el.id = 'lobby-mirror';
      document.body.appendChild(el);
    }
    if (m.stage === 'hide') {
      el.style.display = 'none';
      el.classList.remove('lm-target-screen');
      return;
    }
    el.style.display = 'flex';
    el.classList.toggle('lm-target-screen', m.stage === 'target');
    const MARK_IMG = `<img class="cs-logo-mark" src="/cricswing-mark.png" alt="" />`;
    const LOGO = `<div class="cs-logo">${MARK_IMG}<span class="cs-logo-text"><span class="cric">Cric</span><span class="swing">Swing</span></span></div>`;
    const KICKER = (t) => `<div style="font-size:clamp(14px,1.6vh,18px);color:#9ADF6B;letter-spacing:6px;font-weight:900;text-transform:uppercase;margin-bottom:.8em">${t}</div>`;
    // Shared shell so every setup stage matches the toss/target look: stage pill + status spinner.
    const PILL = (t) => `<div class="lm-pill toss" style="margin-bottom:.2em">${t}</div>`;
    const STATUS = (title, sub) => `<div class="lm-status-wrap" style="animation:none;opacity:1;margin-top:.7em"><div class="cs-status"><div class="cs-status-icon"><div class="cs-spinner"></div></div><div class="cs-status-body"><div class="cs-status-title">${title}</div><div class="cs-status-sub">${sub}</div></div></div></div>`;
    const OPTIONS_ROW = (items) => (items && items.length) ? `<div class="lm-options">${items.map(o => `<span>${o}</span>`).join('<span class="lm-opt-sep"> · </span>')}</div>` : '';
    const SETUP_WAITING = ({ pill, accent, options, statusSub }) =>
      LOGO + PILL(pill) +
      `<div class="lm-setup-title">Choose your <span class="lm-accent">${accent}</span></div>` +
      OPTIONS_ROW(options) +
      STATUS('Waiting for your pick…', statusSub);
    let html = '';
    if (m.stage === 'mode') {
      const labels = { wc: 'Chase World Cup', lg: 'Chase Leagues', practice: 'Net Practice' };
      if (m.mode) {
        html = LOGO + PILL('Game Mode') +
          `<div style="font-size:clamp(48px,11vh,84px);font-weight:900;color:#9ADF6B;line-height:1.05;letter-spacing:1px;text-shadow:0 0 32px rgba(154,223,107,.4)">${labels[m.mode] || 'Match'}</div>` +
          STATUS('Locking it in…', 'Setting up your match…');
      } else {
        html = SETUP_WAITING({
          pill: 'Pick Your Mode', accent: 'mode',
          // Data-driven when the config supplies titles; monolith defaults otherwise.
          options: m.options || ['Chase World Cup', 'Chase Leagues'],
          statusSub: 'Choose a mode on your phone.'
        });
      }
    } else if (m.stage === 'country') {
      html = SETUP_WAITING({
        pill: 'Pick Country', accent: 'country',
        options: [],
        statusSub: 'Choose your country on your phone.'
      });
    } else if (m.stage === 'city') {
      html = SETUP_WAITING({
        pill: 'Pick City', accent: 'city',
        options: [],
        statusSub: 'Choose your city on your phone.'
      });
    } else if (m.stage === 'teamwait') {
      // ADDED stage (not in monolith): plain team-branch picker; same component.
      html = SETUP_WAITING({
        pill: 'Pick Team', accent: 'team',
        options: [],
        statusSub: 'Choose your team on your phone.'
      });
    } else if (m.stage === 'team') {
      const t = m.team || {};
      const short = (t.short || 'TM');
      const color = t.color || '#9ADF6B';
      html = LOGO + PILL('Picking Team') +
        `<div style="font-size:clamp(80px,18vh,140px);font-weight:900;color:${color};line-height:1;letter-spacing:4px;text-shadow:0 0 32px ${color}66">${short}</div>` +
        `<div style="margin-top:.2em;font-size:clamp(20px,3.5vh,32px);color:#cde;letter-spacing:2px">${t.name || short}</div>` +
        STATUS('Choosing the squad…', 'Format and difficulty come next.');
    } else if (m.stage === 'format') {
      if (m.fmt == null) {
        html = SETUP_WAITING({
          pill: 'Match Format', accent: 'format',
          options: ['Friendly', 'Series', 'Tournament'],
          statusSub: 'Choose a format on your phone.'
        });
      } else {
        const fmtName = m.fmt === 1 ? 'Friendly · 1 over' : m.fmt === 2 ? 'Series · Best of 3' : m.fmt === 5 ? 'Tournament · Knockout' : 'Match';
        html = LOGO + PILL('Match Format') +
          `<div style="font-size:clamp(48px,11vh,84px);font-weight:900;color:#F3D86B;line-height:1.05;letter-spacing:2px">${fmtName}</div>` +
          STATUS('Locking the format…', 'Difficulty is up next.');
      }
    } else if (m.stage === 'diff') {
      if (!m.difficulty) {
        html = SETUP_WAITING({
          pill: 'Choose Difficulty', accent: 'difficulty',
          options: ['Easy', 'Medium', 'Hard'],
          statusSub: 'Choose difficulty on your phone.'
        });
      } else {
        const d = m.difficulty;
        const diffColor = d === 'easy' ? '#9ADF6B' : d === 'medium' ? '#F3D86B' : '#ff5a5a';
        html = LOGO + PILL('Difficulty') +
          `<div style="font-size:clamp(80px,18vh,140px);font-weight:900;color:${diffColor};line-height:1;letter-spacing:6px;text-transform:uppercase;text-shadow:0 0 36px ${diffColor}66">${d}</div>` +
          STATUS('Setting difficulty…', 'Coin toss is up next.');
      }
    } else if (m.stage === 'toss') {
      const winColor = m.winColor || '#F3D86B';
      const chaseColor = m.chaseColor || '#5da3ff';
      const winInits = (m.winner || 'TM').slice(0, 3).toUpperCase();
      const chaseInits = (m.chase || 'OP').slice(0, 3).toUpperCase();
      const winName = m.winnerName || m.winner || winInits;
      const chaseName = m.chaseName || m.chase || chaseInits;
      const VS = `<div class="lm-vs-strip">
        <span class="lm-team"><span class="lm-badge" style="background:linear-gradient(135deg,${winColor},${winColor}99)">${winInits}</span>${winName}</span>
        <span class="lm-vs">vs</span>
        <span class="lm-team"><span class="lm-badge" style="background:linear-gradient(135deg,${chaseColor},${chaseColor}99)">${chaseInits}</span>${chaseName}</span>
      </div>
      <div class="lm-pill toss">Coin Toss</div>`;
      if (m.phase === 'ready') {
        // Player is on the toss screen but hasn't flipped yet — show the coin ready,
        // winner hidden, until they tap the coin on the phone.
        html = LOGO + VS +
          `<div class="lm-coin-stage" aria-hidden="true"><div class="lm-coin" style="animation:none;transform:rotateY(0deg) scale(1)"><div class="lm-coin-face heads" style="background:radial-gradient(circle at 35% 30%,#fff7c2,#F3D86B 45%,#a87a18 100%)"><div class="lm-coin-team">?</div><div class="lm-coin-sub">Toss</div></div></div></div>` +
          STATUS('Tap the coin on your phone…', 'The toss happens when you flip it.');
      } else {
        // Player tapped — play the 3D flip and reveal the winner.
        html = LOGO + VS + `
      <div class="lm-coin-stage" aria-hidden="true">
        <div class="lm-coin-rim"></div>
        <div class="lm-coin">
          <div class="lm-coin-face heads" style="background:radial-gradient(circle at 35% 30%,#fff7c2,#F3D86B 45%,#a87a18 100%)">
            <div class="lm-coin-team">${winInits}</div>
            <div class="lm-coin-sub">Wins Toss</div>
          </div>
          <div class="lm-coin-face tails">
            <div class="lm-coin-sub">CricSwing</div>
          </div>
        </div>
      </div>
      <div class="lm-outcome">
        <div class="lm-outcome-title"><b>${winName}</b> won the toss</div>
        <div class="lm-outcome-sub">${winName} will <b>bat first</b>. ${chaseName} to chase.</div>
      </div>
      <div class="lm-status-wrap">
        <div class="cs-status">
          <div class="cs-status-icon"><div class="cs-spinner"></div></div>
          <div class="cs-status-body">
            <div class="cs-status-title">Setting the target…</div>
            <div class="cs-status-sub">${winName} is batting first. Your chase target is being calculated.</div>
          </div>
        </div>
      </div>`;
      }
    } else if (m.stage === 'target') {
      const oppName = m.oppName || m.opp || 'Opponent';
      const oppColor = m.oppColor || '#5da3ff';
      const oppShort = (m.opp || oppName.slice(0, 3)).toUpperCase();
      const cpuRuns = m.cpuScore;
      const cpuWkts = (m.cpuWkts != null) ? m.cpuWkts : 0;
      const cpuOvers = m.cpuOvers || (m.balls / 6).toFixed(1);
      const overs = Math.max(1, Math.round(m.balls / 6));
      const rr = m.balls > 0 ? (cpuRuns / (m.balls / 6)).toFixed(2) : '0.00';
      const reqRR = m.balls > 0 ? (m.target / (m.balls / 6)).toFixed(2) : '0.00';
      html = `<div class="lm-target-stack">
      <div class="lm-pill target">Innings 1 · Complete</div>
      <div class="lm-innings-card">
        <div class="lm-innings-team">
          <span class="lm-innings-badge" style="background:linear-gradient(135deg,${oppColor},${oppColor}99)">${oppShort}</span>
          <span class="lm-innings-name">${oppName}</span>
        </div>
        <div class="lm-innings-divider"></div>
        <div class="lm-innings-score">
          <span class="lm-innings-label">Final Score</span>
          <span class="lm-innings-runs">${cpuRuns}<span class="wkts">/${cpuWkts}</span></span>
          <span class="lm-innings-overs">${cpuOvers} OV · RR ${rr}</span>
        </div>
      </div>
      <div class="lm-chase">
        <div class="lm-chase-label">Your target to <b>win</b></div>
        <div class="lm-chase-number">${m.target}</div>
        <div class="lm-chase-suffix">in <b>${m.balls} balls</b> · ${overs} over${overs > 1 ? 's' : ''}</div>
      </div>
      <div class="lm-req-strip">
        <div class="lm-req-tile">
          <span class="lm-req-label">Req RR</span>
          <span class="lm-req-value">${reqRR}</span>
          <span class="lm-req-sub">r/o</span>
        </div>
        <div class="lm-req-tile hot">
          <span class="lm-req-label">Need</span>
          <span class="lm-req-value">${m.target}</span>
          <span class="lm-req-sub">win</span>
        </div>
        <div class="lm-req-tile">
          <span class="lm-req-label">Wkts</span>
          <span class="lm-req-value">10</span>
          <span class="lm-req-sub">left</span>
        </div>
      </div>
      <div class="lm-status-wrap">
        <div class="cs-status">
          <div class="cs-status-icon"><div class="cs-spinner"></div></div>
          <div class="cs-status-body">
            <div class="cs-status-title">Tap BAT NOW on your phone when ready</div>
            <div class="cs-status-sub">Hold your phone like a bat.</div>
          </div>
        </div>
      </div>
    </div>`;
    }
    el.innerHTML = html;
    // Unknown/empty stage → don't show an empty mirror over the screen; hide it.
    if (!html) { el.style.display = 'none'; }
    window.__lmLastStage = m; // verification capture
  }

  // ── (b) adapter: framework lobby_step → monolith lobby_state stages ──────
  // Toss semantics (games/cricswing/lobby.html onCeremony): the CPU bats first,
  // so the toss "winner" is always the OPPONENT and the player chases — the ref
  // protocol carried the same fields in both toss phases.
  function tossFields(s) {
    return {
      winner: s.oppShort, batFirst: s.oppShort, chase: s.teamShort,
      winnerName: s.opp, chaseName: s.team,
      winColor: s.oppColor, chaseColor: s.teamColor,
    };
  }
  function targetMsg(s) {
    return {
      stage: 'target',
      cpuScore: s.cpu, target: s.target, balls: (s.overs || 2) * 6,
      opp: s.oppShort, oppName: s.opp, oppColor: s.oppColor,
    };
  }

  function mapStep(d) {
    const s = d.selection || {};
    // Monolith tvModeChosen parity (6107): flips only once something is actually
    // PICKED — a pre-pick 'choosing' screen must still fall back to the pairing
    // overlay if the phone drops.
    if (d.phase === 'pick' || d.phase === 'ceremony' || d.phase === 'ready') modeChosen = true;
    switch (d.phase) {
      case 'connected':
        lastShown = 'mode-wait';
        return { stage: 'mode' };
      case 'choosing': {
        const titles = (d.options || []).map(o => (o && (o.title || o.name)) || o).filter(Boolean);
        switch (d.keyName) {
          case 'mode':
            lastShown = 'mode-wait';
            return { stage: 'mode', options: titles.length ? titles : undefined };
          case 'team': {
            const st = d.stepTitle || '';
            if (/country/i.test(st)) { lastShown = 'country'; return { stage: 'country' }; }
            if (/club/i.test(st))    { lastShown = 'city';    return { stage: 'city' }; }
            lastShown = 'teamwait';
            return { stage: 'teamwait' };
          }
          case 'league':
            lastShown = 'city';
            return { stage: 'city' };
          case 'format':
            lastShown = 'format-wait';
            return { stage: 'format' };
          case 'difficulty':
            lastShown = 'diff-wait';
            return { stage: 'diff' };
          default:
            return null;
        }
      }
      case 'pick': {
        const picked = d.picked || {};
        switch (d.keyName) {
          case 'mode':
            lastShown = 'mode';
            return { stage: 'mode', mode: ({ cup: 'wc', league: 'lg' })[picked.id] || 'wc' };
          case 'team':
            lastShown = 'team';
            return { stage: 'team', team: { short: s.teamShort, name: s.team, color: s.teamColor } };
          case 'league':
            return null; // club 'choosing' follows immediately
          case 'format':
            lastShown = 'format';
            return { stage: 'format', fmt: ({ f1: 1, f2: 2, f5: 5 })[s.format] || 1 };
          case 'difficulty':
            lastShown = 'diff';
            return { stage: 'diff', difficulty: picked.id };
          default:
            return null;
        }
      }
      case 'ceremony': {
        if (d.kind !== 'toss') return null;
        // The flow fires 'ceremony' twice: on step render AND on the coin tap
        // (lobby-flow.js:439, :700). The original TV starts the 3D flip the
        // moment the player taps — so the 2nd fire IS the tap → flip now.
        if (lastShown === 'toss-flip') return null; // don't regress a playing flip
        if (lastShown === 'toss-ready') {
          lastShown = 'toss-flip';
          flipAt = Date.now();
          return Object.assign({ stage: 'toss', phase: 'flip' }, tossFields(s));
        }
        lastShown = 'toss-ready';
        return Object.assign({ stage: 'toss', phase: 'ready' }, tossFields(s));
      }
      case 'ready': {
        if (lastShown === 'toss-flip' && s.cpu != null && !targetTimer) {
          // Target data arrives ~1.5s into the flip (settleCeremony). Reveal the
          // target 3.5s AFTER the flip started (original pacing: lobby.html sent
          // the target stage 3.5s after phase:'flip').
          const delay = Math.max(0, 3500 - (Date.now() - flipAt));
          targetTimer = setTimeout(() => {
            targetTimer = null;
            lastShown = 'target';
            renderLobbyMirror(targetMsg(s));
          }, delay);
          return null; // flip keeps playing meanwhile
        }
        if (lastShown === 'toss-ready' && s.cpu != null) {
          // Tap 'ceremony' was missed (drop/reconnect) — flip now, target 3.5s later.
          lastShown = 'toss-flip';
          flipAt = Date.now();
          clearTimeout(targetTimer);
          targetTimer = setTimeout(() => {
            targetTimer = null;
            lastShown = 'target';
            renderLobbyMirror(targetMsg(s));
          }, 3500);
          return Object.assign({ stage: 'toss', phase: 'flip' }, tossFields(s));
        }
        // Duplicate ready (summary step) while flip/target showing or timer pending.
        if (lastShown === 'toss-flip' || lastShown === 'target' || targetTimer) return null;
        // Fresh page / screen_rejoined rebroadcast with a settled target → target directly.
        if (s.target != null) { lastShown = 'target'; return targetMsg(s); }
        return null;
      }
      default:
        return null;
    }
  }

  // ── (c) framework overrides (Level-2, DOC/OVERRIDES.md) ──────────────────
  window.FrameworkTemplates.showTVSetup = function (d) {
    const m = mapStep(d);
    if (m) renderLobbyMirror(m);
  };
  window.FrameworkTemplates.hideTVSetup = function () {
    clearTimeout(targetTimer);
    targetTimer = null;
    lastShown = null;
    const el = document.getElementById('lobby-mirror');
    if (el) { el.style.display = 'none'; el.classList.remove('lm-target-screen'); }
  };
  // Pairing-overlay churn guard (monolith tvInLobby parity, source 6376-6387):
  // mid-lobby WS churn (lobby→controller handoff) must not slap the pairing
  // code over the toss/target screens. Pre-mode it still shows (re-pair works).
  const _renderPairing = window.FrameworkUI.renderPairingOverlay.bind(window.FrameworkUI);
  window.FrameworkUI.renderPairingOverlay = function (...args) {
    if (modeChosen && mirrorVisible()) return;
    return _renderPairing(...args);
  };

  // ── (d) conn-badge + boot parity ──────────────────────────────────────────
  let badge = document.getElementById('conn-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'conn-badge';
    badge.textContent = 'Waiting for bat phone...';
    document.body.appendChild(badge);
  }
  window.FrameworkEvents.on('bat_connected', () => {
    badge.innerHTML = '<span class="conn-paired-dot" aria-hidden="true"></span><span>Bat phone connected</span>';
    // Monolith 6091: first connect after pairing auto-shows the Pick-Your-Mode
    // mirror; a real lobby_step arriving later just refines the same screen.
    if (!modeChosen) renderLobbyMirror({ stage: 'mode' });
  });
  window.FrameworkEvents.on('bat_disconnected', () => {
    badge.textContent = 'Bat disconnected — waiting…';
  });
  // Monolith 6942 parity: boot straight into the mode-waiting mirror. It sits
  // UNDER the framework pairing overlay (z-999 vs z-75) until the phone pairs.
  renderLobbyMirror({ stage: 'mode' });
  lastShown = 'mode-wait';
})();
