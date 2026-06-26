'use strict';

/**
 * ChaseShot — CRICKET-specific shot/visual math for the `chase` game. Moved OUT of
 * the framework core (it used to live in framework/renderer/shot-visuals.js) so the
 * framework stays sport-neutral; only this game knows about runs/wickets/overs.
 *
 * Generic geometry (perspective, boundary, RNG, angle) comes from window.Projectile
 * (framework/renderer/projectile.js). Exposed as window.ChaseShot; also
 * module.exports for the Node test.
 */
(function () {
  const P = (typeof window !== 'undefined' && window.Projectile)
    ? window.Projectile
    : require('../../framework/renderer/projectile.js');

  const FM_RAY_DEG = { str: -90, off: -130, leg: -50, lofted: -90, sweep: 45 };

  /** Striker contact point used by buildVisual (not a player-sprite anchor). */
  function batsmanOrigin(W, H) {
    const { cx, nearY, nearW } = P.perspective(W, H);
    return { bx: cx + nearW * 0.25, by: nearY - 20 };
  }

  function computeShotLanding(msg, W, H, batHandedness, rng) {
    const random = rng || Math.random;
    const { cx, nearY, nearW, horizY } = P.perspective(W, H);
    const runs = msg.runs || 0;
    const dirSign = batHandedness === 'left' ? -1 : 1;
    const landD = runs >= 6 ? 1.08 : runs >= 4 ? 0.90 : runs >= 3 ? 0.70 : runs >= 2 ? 0.54 : runs >= 1 ? 0.40 : 0.26;
    let landGroundY = landD <= 1
      ? nearY - (nearY - horizY) * landD
      : horizY - (nearY - horizY) * (landD - 1) * 0.45;
    const sideMag = nearW * (runs >= 6 ? 2.6 : runs >= 4 ? 1.9 : runs >= 2 ? 1.1 : 0.6) + random() * nearW * 0.35;
    let landX;
    const dir = msg.dir || 'str';
    if (dir === 'off') landX = cx + dirSign * sideMag;
    else if (dir === 'leg') landX = cx - dirSign * sideMag;
    else if (dir === 'sweep') {
      landX = cx - dirSign * (nearW * (runs >= 4 ? 1.9 : 1.2));
      landGroundY = nearY - (nearY - horizY) * Math.min(landD, 0.62);
    } else if (dir === 'lofted') landX = cx + dirSign * (random() * nearW * 0.5 - nearW * 0.25);
    else landX = cx + (random() - 0.5) * nearW * 0.4;

    let rollToX = null;
    let rollToY = null;
    const { bx, by } = batsmanOrigin(W, H);
    if (runs >= 4 && runs < 6) {
      const R = P.ropeHit(W, H, bx, by, landX - bx, landGroundY - by);
      if (R) {
        rollToX = R.x;
        rollToY = R.y;
        landX = bx + (R.x - bx) * 0.80;
        landGroundY = by + (R.y - by) * 0.80;
      }
    }
    return { landX, landGroundY, rollToX, rollToY, landD };
  }

  function computeWheelRay(msg, land, W, H, bx, by) {
    if (msg.dismissed) {
      const d = msg.dir || 'str';
      return { dir: d, runs: 0, dismissed: true, angDeg: FM_RAY_DEG[d] != null ? FM_RAY_DEG[d] : FM_RAY_DEG.str, distNorm: 0.22 };
    }
    const tx = land.rollToX != null ? land.rollToX : land.landX;
    const ty = land.rollToY != null ? land.rollToY : land.landGroundY;
    const { horizY, nearY } = P.perspective(W, H);
    const maxDist = (nearY - horizY) * 1.08;
    const dist = Math.hypot(tx - bx, ty - by);
    return {
      dir: msg.dir || 'str',
      runs: msg.runs || 0,
      dismissed: false,
      angDeg: P.fmAngleFromCanvas(bx, by, tx, ty),
      distNorm: Math.min(1, dist / Math.max(1, maxDist)),
      landD: land.landD,
    };
  }

  function computeArcParams(msg, W, H) {
    const runs = msg.runs || 0;
    const dir = msg.dir || 'str';
    const arcH = dir === 'lofted' ? H * (runs >= 6 ? 0.34 : 0.22)
      : dir === 'sweep' ? H * (runs >= 6 ? 0.10 : 0.07)
        : runs >= 6 ? H * 0.30
          : runs >= 4 ? H * 0.12
            : H * 0.045 * Math.max(1, runs);
    const dur = runs >= 6 ? 66 : runs >= 4 ? 54 : 42;
    return { parametric: true, dur, arcH, big: runs >= 6, grounded: runs >= 4 && runs < 6, r: 16 };
  }

  function fielderIndexForCatch(dir) {
    if (dir === 'off') return 2;
    if (dir === 'leg') return 4;
    if (dir === 'lofted') return 7;
    if (dir === 'sweep') return 5;
    return 6;
  }

  function computeDismissalVisual(msg, W, H) {
    const dt = msg.dismissalType;
    if (dt === 'caught') return { type: 'caught', fielderIndex: fielderIndexForCatch(msg.dir || 'str') };
    if (dt === 'bowled') {
      return { type: 'bowled', integrator: { x: W / 2, y: H * 0.305, z: 0, vx: 0, vy: (H * 0.83 - H * 0.305) / 45, vz: 0, r: 6 } };
    }
    if (dt === 'lbw') {
      return { type: 'lbw', integrator: { x: W / 2, y: H * 0.305, z: 0, vx: 0, vy: (H * 0.79 - H * 0.305) / 40, vz: 0, r: 6 } };
    }
    return null;
  }

  function calcWinProb(score, tvTarget, tvOvers) {
    if (!tvTarget || !tvOvers) return 0.5;
    const need = Math.max(0, tvTarget - score.runs);
    const ballsLeft = Math.max(1, tvOvers * 6 - score.balls);
    if (need <= 0) return 1;
    if (ballsLeft <= 0 && need > 0) return 0;
    const rrr = need / (ballsLeft / 6);
    return 1 / (1 + Math.exp(0.35 * (rrr - 8.5)));
  }

  const SHOT_COLORS = {
    'SIX!': '#ffd700', 'FOUR!': '#4af', THREE: '#7edb7e', TWO: '#b0e8b0', ONE: '#fff',
    'DOT BALL': '#888', 'BOWLED!': '#ff4444', 'CAUGHT!': '#ff6622', 'LBW!': '#ffaa00',
  };

  function computeFxHints(msg) {
    const runs = msg.runs || 0;
    const color = SHOT_COLORS[msg.name || ''] || '#fff';
    return {
      particleCount: runs >= 6 ? 55 : runs >= 4 ? 32 : runs > 0 ? 14 : 0,
      crowdWave: runs >= 4 ? 180 : 0,
      sixZoom: runs >= 6,
      bannerColor: color,
    };
  }

  function defaultMilestoneState() { return { shown: {}, consecutiveSixes: 0, lastSixBallNum: 0 }; }

  function computeMilestoneEvents(msg, score, tvTarget, tvOvers, stateIn) {
    const state = stateIn ? {
      shown: Object.assign({}, stateIn.shown || {}),
      consecutiveSixes: stateIn.consecutiveSixes || 0,
      lastSixBallNum: stateIn.lastSixBallNum || 0,
    } : defaultMilestoneState();
    const events = [];
    const b = score.balls;
    const need = Math.max(0, tvTarget - score.runs);
    const ballsLeft = Math.max(0, tvOvers * 6 - b);
    const ballRuns = msg.runs || 0;
    const before = score.runs - ballRuns;

    if (msg.runs >= 6) {
      if (b - state.lastSixBallNum <= 1) state.consecutiveSixes++;
      else state.consecutiveSixes = 1;
      state.lastSixBallNum = b;
      const csKey = 'cs' + Math.floor(b / 2);
      if (state.consecutiveSixes >= 2 && !state.shown[csKey]) {
        events.push({ kind: 'banner', text: '🔥 BACK-TO-BACK SIXES!', color: '#ffd700' });
        state.shown[csKey] = true;
      }
    } else {
      state.consecutiveSixes = 0;
    }

    if (score.runs >= 100 && before < 100 && !state.shown['100up']) {
      state.shown['100up'] = true;
      events.push({ kind: 'big', kicker: 'CENTURY', big: '100', sub: 'Magnificent innings!', dur: 4800, emojis: ['🏆', '💯', '🎆', '🎇', '✨', '🔥', '⭐', '🌟'] });
    } else if (score.runs >= 50 && before < 50 && !state.shown['50up']) {
      state.shown['50up'] = true;
      events.push({ kind: 'big', kicker: 'HALF CENTURY', big: '50', sub: 'Well-played!', dur: 3200, emojis: ['🎉', '✨', '🌟', '⭐', '💫'] });
    }

    if (ballsLeft <= 6 && ballsLeft > 0 && !state.shown.finalover) {
      events.push({ kind: 'banner', text: '⚡ FINAL OVER!', color: '#ff8822' });
      state.shown.finalover = true;
    }
    if (ballsLeft <= 3 && ballsLeft > 0 && !state.shown.last3) {
      events.push({ kind: 'banner', text: '⏰ LAST 3 BALLS!', color: '#ff4444' });
      state.shown.last3 = true;
    }
    if (tvTarget > 0 && need <= 6 && need > 0 && ballsLeft >= need && !state.shown.almost) {
      events.push({ kind: 'banner', text: '😤 ALMOST THERE!', color: '#7edb7e' });
      state.shown.almost = true;
    }

    return { events, state };
  }

  /** Build the full visual block for a shot (used by the TV draw). */
  function buildVisual(msg, opts) {
    const W = opts.W;
    const H = opts.H;
    const batHandedness = opts.batHandedness || 'right';
    const tvTarget = opts.tvTarget || 0;
    const tvOvers = opts.tvOvers || 0;
    const score = msg.score || { runs: 0, wickets: 0, balls: 0 };
    const seedStr = `${opts.roomCode || ''}:${score.balls || 0}:${msg.runs || 0}:${msg.dir || ''}`;
    const seed = P.hashSeed(seedStr);
    const rng = P.mulberry32(seed);
    const { bx, by } = batsmanOrigin(W, H);

    let milestoneResult = { events: [], state: opts.milestoneState || defaultMilestoneState() };
    if (!opts.skipMilestones && score.balls != null) {
      milestoneResult = computeMilestoneEvents(msg, score, tvTarget, tvOvers, opts.milestoneState);
    }

    const winProb = calcWinProb(score, tvTarget, tvOvers);
    const fx = computeFxHints(msg);

    if (msg.dismissed) {
      const dismissal = computeDismissalVisual(msg, W, H);
      const wheelRay = computeWheelRay(msg, {}, W, H, bx, by);
      return {
        v: 1, seed, origin: { bx, by }, landing: null,
        ball: dismissal && dismissal.integrator ? Object.assign({ trail: [], done: false }, dismissal.integrator) : null,
        wheelRay, dismissal, milestones: milestoneResult.events, winProb, fx, _milestoneState: milestoneResult.state,
      };
    }

    const landing = computeShotLanding(msg, W, H, batHandedness, rng);
    const ball = computeArcParams(msg, W, H);
    const wheelRay = computeWheelRay(msg, landing, W, H, bx, by);

    return {
      v: 1, seed, origin: { bx, by }, landing, ball, wheelRay, dismissal: null,
      milestones: milestoneResult.events, winProb, fx, _milestoneState: milestoneResult.state,
    };
  }

  const api = {
    FM_RAY_DEG, batsmanOrigin, computeShotLanding, computeWheelRay, computeArcParams,
    fielderIndexForCatch, computeDismissalVisual, calcWinProb, computeFxHints,
    defaultMilestoneState, computeMilestoneEvents, buildVisual,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ChaseShot = api;
})();
