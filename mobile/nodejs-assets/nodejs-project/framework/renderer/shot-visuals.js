'use strict';

/**
 * Pure shot/projectile visual math — shared by TV (browser) and the Node server.
 *
 * This is generic, cricket-agnostic geometry: given a "shot" (runs + direction)
 * and the canvas size, it computes where a ball lands, its arc, the wagon-wheel
 * ray, dismissal paths, milestone events, fx hints and a win-probability number.
 * The drawing itself lives in arena-scene.js / the game's draw fn — this module
 * only does the math, so it can run identically on phone, TV and server.
 *
 * All canvas-relative values use perspective(W,H) ratios (see arena-scene.js).
 * Ported from CricSwing's web/shared/shot-visuals.js without change so the
 * reused gallery keeps pixel-for-pixel behaviour. window.ShotVisuals.
 */

const FM_RAY_DEG = { str: -90, off: -130, leg: -50, lofted: -90, sweep: 45 };

function perspective(W, H) {
  return {
    cx: W / 2,
    horizY: H * 0.30,
    farY: H * 0.44,
    nearY: H * 0.83,
    farW: W * 0.05,
    nearW: W * 0.22,
  };
}

/** Striker contact point used by onShot (not a player-sprite anchor). */
function batsmanOrigin(W, H) {
  const { cx, nearY, nearW } = perspective(W, H);
  return { bx: cx + nearW * 0.25, by: nearY - 20 };
}

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ropeHit(W, H, px, py, dx, dy) {
  const horizY = H * 0.30;
  const cx = W / 2;
  const ey = horizY + (H - horizY) * 0.70;
  const erx = W * 0.46;
  const ery = (H - horizY) * 0.57;
  const ox = (px - cx) / erx;
  const oy = (py - ey) / ery;
  const ax = dx / erx;
  const ay = dy / ery;
  const A = ax * ax + ay * ay;
  if (A === 0) return null;
  const B = 2 * (ox * ax + oy * ay);
  const C = ox * ox + oy * oy - 1;
  const disc = B * B - 4 * A * C;
  if (disc < 0) return null;
  const t = (-B + Math.sqrt(disc)) / (2 * A);
  if (!(t > 0)) return null;
  return { x: px + t * dx, y: py + t * dy };
}

function computeShotLanding(msg, W, H, batHandedness, rng) {
  const random = rng || Math.random;
  const { cx, nearY, nearW, horizY } = perspective(W, H);
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
    const R = ropeHit(W, H, bx, by, landX - bx, landGroundY - by);
    if (R) {
      rollToX = R.x;
      rollToY = R.y;
      landX = bx + (R.x - bx) * 0.80;
      landGroundY = by + (R.y - by) * 0.80;
    }
  }
  return { landX, landGroundY, rollToX, rollToY, landD };
}

function fmAngleFromCanvas(bx, by, tx, ty) {
  const dx = tx - bx;
  const dy = ty - by;
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return FM_RAY_DEG.str;
  return Math.atan2(dx, -dy) * 180 / Math.PI;
}

function computeWheelRay(msg, land, W, H, bx, by) {
  if (msg.dismissed) {
    const d = msg.dir || 'str';
    return {
      dir: d,
      runs: 0,
      dismissed: true,
      angDeg: FM_RAY_DEG[d] ?? FM_RAY_DEG.str,
      distNorm: 0.22,
    };
  }
  const tx = land.rollToX ?? land.landX;
  const ty = land.rollToY ?? land.landGroundY;
  const { horizY, nearY } = perspective(W, H);
  const maxDist = (nearY - horizY) * 1.08;
  const dist = Math.hypot(tx - bx, ty - by);
  return {
    dir: msg.dir || 'str',
    runs: msg.runs || 0,
    dismissed: false,
    angDeg: fmAngleFromCanvas(bx, by, tx, ty),
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
  return {
    parametric: true,
    dur,
    arcH,
    big: runs >= 6,
    grounded: runs >= 4 && runs < 6,
    r: 16,
  };
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
  if (dt === 'caught') {
    return { type: 'caught', fielderIndex: fielderIndexForCatch(msg.dir || 'str') };
  }
  if (dt === 'bowled') {
    return {
      type: 'bowled',
      integrator: {
        x: W / 2,
        y: H * 0.305,
        z: 0,
        vx: 0,
        vy: (H * 0.83 - H * 0.305) / 45,
        vz: 0,
        r: 6,
      },
    };
  }
  if (dt === 'lbw') {
    return {
      type: 'lbw',
      integrator: {
        x: W / 2,
        y: H * 0.305,
        z: 0,
        vx: 0,
        vy: (H * 0.79 - H * 0.305) / 40,
        vz: 0,
        r: 6,
      },
    };
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
  'SIX!': '#ffd700',
  'FOUR!': '#4af',
  THREE: '#7edb7e',
  TWO: '#b0e8b0',
  ONE: '#fff',
  'DOT BALL': '#888',
  'BOWLED!': '#ff4444',
  'CAUGHT!': '#ff6622',
  'LBW!': '#ffaa00',
};

function computeFxHints(msg) {
  const runs = msg.runs || 0;
  const name = msg.name || '';
  const color = SHOT_COLORS[name] || '#fff';
  return {
    particleCount: runs >= 6 ? 55 : runs >= 4 ? 32 : runs > 0 ? 14 : 0,
    crowdWave: runs >= 4 ? 180 : 0,
    sixZoom: runs >= 6,
    bannerColor: color,
  };
}

function defaultMilestoneState() {
  return { shown: {}, consecutiveSixes: 0, lastSixBallNum: 0 };
}

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
    events.push({
      kind: 'big',
      kicker: 'CENTURY',
      big: '100',
      sub: 'Magnificent innings!',
      dur: 4800,
      emojis: ['🏆', '💯', '🎆', '🎇', '✨', '🔥', '⭐', '🌟'],
    });
  } else if (score.runs >= 50 && before < 50 && !state.shown['50up']) {
    state.shown['50up'] = true;
    events.push({
      kind: 'big',
      kicker: 'HALF CENTURY',
      big: '50',
      sub: 'Well-played!',
      dur: 3200,
      emojis: ['🎉', '✨', '🌟', '⭐', '💫'],
    });
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

/**
 * Build the full visual block for a shot (used by the TV draw + server relay).
 */
function buildVisual(msg, opts) {
  const W = opts.W;
  const H = opts.H;
  const batHandedness = opts.batHandedness || 'right';
  const tvTarget = opts.tvTarget || 0;
  const tvOvers = opts.tvOvers || 0;
  const score = msg.score || { runs: 0, wickets: 0, balls: 0 };
  const seedStr = `${opts.roomCode || ''}:${score.balls || 0}:${msg.runs || 0}:${msg.dir || ''}`;
  const seed = hashSeed(seedStr);
  const rng = mulberry32(seed);
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
      v: 1,
      seed,
      origin: { bx, by },
      landing: null,
      ball: dismissal && dismissal.integrator
        ? Object.assign({ trail: [], done: false }, dismissal.integrator)
        : null,
      wheelRay,
      dismissal,
      milestones: milestoneResult.events,
      winProb,
      fx,
      _milestoneState: milestoneResult.state,
    };
  }

  const landing = computeShotLanding(msg, W, H, batHandedness, rng);
  const ball = computeArcParams(msg, W, H);
  const wheelRay = computeWheelRay(msg, landing, W, H, bx, by);

  return {
    v: 1,
    seed,
    origin: { bx, by },
    landing,
    ball,
    wheelRay,
    dismissal: null,
    milestones: milestoneResult.events,
    winProb,
    fx,
    _milestoneState: milestoneResult.state,
  };
}

const api = {
  FM_RAY_DEG,
  perspective,
  batsmanOrigin,
  hashSeed,
  mulberry32,
  ropeHit,
  computeShotLanding,
  fmAngleFromCanvas,
  computeWheelRay,
  computeArcParams,
  fielderIndexForCatch,
  computeDismissalVisual,
  calcWinProb,
  computeFxHints,
  defaultMilestoneState,
  computeMilestoneEvents,
  buildVisual,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
if (typeof window !== 'undefined') {
  window.ShotVisuals = api;
}
