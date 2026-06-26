'use strict';

/**
 * Projectile — pure, SPORT-NEUTRAL projectile/field geometry shared by TV
 * (browser) and Node (server/tests). It knows nothing about any sport: just the
 * pitch perspective, the boundary ellipse, a seeded RNG, an angle helper, and a
 * generic arc. Sport-specific scoring/visual mapping (e.g. cricket runs→landing)
 * lives in the game, not here — see games/chase/chase-shot.js.
 *
 * Exposed as window.Projectile, with window.ShotVisuals kept as a back-compat
 * alias (older code calls ShotVisuals.perspective). Also module.exports for Node.
 */

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

/** Ray↔boundary-ellipse intersection (the drawn rope). Generic geometry. */
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

function fmAngleFromCanvas(bx, by, tx, ty) {
  const dx = tx - bx;
  const dy = ty - by;
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return -90;
  return Math.atan2(dx, -dy) * 180 / Math.PI;
}

/** Generic arc by normalized power (0..1): flight duration + height. */
function arc(power, W, H) {
  const p = Math.max(0, Math.min(1, power || 0));
  return { dur: Math.round(42 + p * 24), arcH: H * (0.05 + p * 0.25), big: p >= 0.9, r: 16 };
}

const api = {
  perspective,
  ropeHit,
  boundaryHit: ropeHit,   // neutral name
  hashSeed,
  mulberry32,
  fmAngleFromCanvas,
  arc,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
if (typeof window !== 'undefined') {
  window.Projectile = api;
  window.ShotVisuals = window.ShotVisuals || api;   // back-compat alias (perspective, etc.)
}
