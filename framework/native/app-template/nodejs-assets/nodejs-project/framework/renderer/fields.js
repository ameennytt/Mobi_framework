'use strict';

/**
 * FrameworkFields — sport "field" overlays drawn on top of the FrameworkArena stadium.
 *
 * Each entry is a pure draw fn (ctx, W, H) positioned with ShotVisuals.perspective
 * so it lines up with the pitch/boundary. The arena draws the chosen one in its
 * ground layer: FrameworkArena.install({ field: 'goal' }). No field = bare stadium.
 *
 *   goal        football / hockey net + posts (centre, near the far third)
 *   court       tennis / volleyball net + side lines
 *   lanes       bowling / running lanes converging to the horizon
 *   targetBoard archery / darts board on a stand
 *
 * window.FrameworkFields.
 */
window.FrameworkFields = (function () {
  function P(W, H) { return window.ShotVisuals.perspective(W, H); }
  function accent() {
    try { return getComputedStyle(document.documentElement).getPropertyValue('--game-accent').trim() || '#ffffff'; }
    catch (_) { return '#ffffff'; }
  }

  // Football / hockey goal — posts + crossbar + net mesh, planted up-field.
  function goal(c, W, H) {
    const { cx, horizY, nearY } = P(W, H);
    const gy = horizY + (nearY - horizY) * 0.34;   // depth of the goal line
    const gw = W * 0.20, gh = H * 0.12;
    const lx = cx - gw / 2, rx = cx + gw / 2, top = gy - gh;
    // net mesh
    c.save();
    c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 1;
    for (let i = 1; i < 8; i++) { const x = lx + (gw * i / 8); c.beginPath(); c.moveTo(x, top); c.lineTo(x, gy); c.stroke(); }
    for (let j = 1; j < 5; j++) { const y = top + (gh * j / 5); c.beginPath(); c.moveTo(lx, y); c.lineTo(rx, y); c.stroke(); }
    c.restore();
    // frame
    c.strokeStyle = '#ffffff'; c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(lx, gy); c.lineTo(lx, top); c.lineTo(rx, top); c.lineTo(rx, gy); c.stroke();
    // goal-area arc
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(cx, gy, gw * 0.9, gh * 0.28, 0, 0, Math.PI, true); c.stroke();
  }

  // Tennis / volleyball net across the middle of the court + tramlines.
  function court(c, W, H) {
    const { cx, horizY, nearY } = P(W, H);
    const ny = horizY + (nearY - horizY) * 0.5;
    const nw = W * 0.34, nh = H * 0.07;
    const lx = cx - nw / 2, rx = cx + nw / 2;
    // tramlines (perspective)
    c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 2;
    [-1, -0.5, 0.5, 1].forEach(t => {
      c.beginPath(); c.moveTo(cx + t * W * 0.05, horizY + 6); c.lineTo(cx + t * W * 0.30, nearY); c.stroke();
    });
    // net
    c.save();
    c.strokeStyle = 'rgba(255,255,255,0.30)'; c.lineWidth = 1;
    for (let i = 0; i <= 16; i++) { const x = lx + nw * i / 16; c.beginPath(); c.moveTo(x, ny - nh); c.lineTo(x, ny); c.stroke(); }
    for (let j = 0; j <= 3; j++) { const y = ny - nh * j / 3; c.beginPath(); c.moveTo(lx, y); c.lineTo(rx, y); c.stroke(); }
    c.restore();
    c.strokeStyle = '#ffffff'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(lx, ny - nh); c.lineTo(rx, ny - nh); c.stroke();       // tape
    c.beginPath(); c.moveTo(lx, ny); c.lineTo(lx, ny - nh); c.stroke();
    c.beginPath(); c.moveTo(rx, ny); c.lineTo(rx, ny - nh); c.stroke();
  }

  // Bowling / running lanes converging toward the horizon.
  function lanes(c, W, H) {
    const { cx, horizY, nearY } = P(W, H);
    const farHalf = W * 0.05, nearHalf = W * 0.24;
    c.strokeStyle = 'rgba(255,255,255,0.30)'; c.lineWidth = 2;
    for (let i = -3; i <= 3; i++) {
      const fx = cx + (i / 3) * farHalf, nx = cx + (i / 3) * nearHalf;
      c.beginPath(); c.moveTo(fx, horizY + 8); c.lineTo(nx, nearY); c.stroke();
    }
    // foul line near camera
    c.strokeStyle = accent(); c.lineWidth = 4;
    c.beginPath(); c.moveTo(cx - nearHalf, nearY); c.lineTo(cx + nearHalf, nearY); c.stroke();
  }

  // Archery / darts target board on a stand.
  function targetBoard(c, W, H) {
    const { cx, horizY, nearY } = P(W, H);
    const ty = horizY + (nearY - horizY) * 0.36;
    const r = Math.min(W, H) * 0.10;
    // stand
    c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(cx, ty + r); c.lineTo(cx - r * 0.4, nearY); c.stroke();
    c.beginPath(); c.moveTo(cx, ty + r); c.lineTo(cx + r * 0.4, nearY); c.stroke();
    // rings
    const cols = ['#ffffff', '#111111', '#3a7bd5', '#e0443e', '#ffd23f'];
    for (let i = 0; i < cols.length; i++) {
      c.beginPath(); c.arc(cx, ty, r * (1 - i * 0.18), 0, Math.PI * 2);
      c.fillStyle = cols[i]; c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1; c.stroke();
    }
  }

  return { goal, court, lanes, targetBoard };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.FrameworkFields;
}
