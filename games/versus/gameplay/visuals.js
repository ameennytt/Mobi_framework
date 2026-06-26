'use strict';

/**
 * GameVisuals — all canvas drawing for the shootout (goal geometry, keeper, shooter,
 * ball). Pure draw helpers: given a ctx + state, paint. No rules, no scoring.
 *
 * Part of the MODULAR game layout. Split out so art/animation can grow large
 * without bloating the rules. Reuses ShotVisuals.perspective for goal geometry so
 * figures sit on the pitch. Loaded before index.js via config `code: [...]`.
 * Exposes window.GameVisuals.
 */
window.GameVisuals = {
  /** Goal geometry shared by onAction + draw (matches fields.goal). */
  geometry(W, H) {
    const p = window.ShotVisuals.perspective(W, H);
    const gy = p.horizY + (p.nearY - p.horizY) * 0.34;   // goal line
    const gw = W * 0.20;
    return { p, gy, gw };
  },

  // Rounded-rect path helper.
  rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  // Goalkeeper at the goal line — stands centre, dives left/right during a shot.
  drawKeeper(ctx, x, y, H, t, diveDX) {
    const s = H * 0.085;
    const dive = Math.max(-1, Math.min(1, diveDX / (H * 0.12))) * t;
    const spread = 0.3 + 0.7 * t;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = 0.22; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(0, s * 0.04, s * 0.32, s * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.rotate(dive * 0.6);
    ctx.fillStyle = '#ffd21e';
    this.rr(ctx, -s * 0.18, -s * 0.7, s * 0.36, s * 0.62, s * 0.1); ctx.fill();
    ctx.strokeStyle = '#ffd21e'; ctx.lineWidth = s * 0.14; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-s * 0.14, -s * 0.5); ctx.lineTo(-s * 0.55 * spread, -s * 0.72);
    ctx.moveTo(s * 0.14, -s * 0.5); ctx.lineTo(s * 0.55 * spread, -s * 0.72);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-s * 0.55 * spread, -s * 0.72, s * 0.11, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.55 * spread, -s * 0.72, s * 0.11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f1c27d';
    ctx.beginPath(); ctx.arc(0, -s * 0.82, s * 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  // Shooter (back to camera) near the spot — kicks as the ball launches.
  drawShooter(ctx, x, y, H, t) {
    const s = H * 0.1;
    const kick = t > 0 && t < 0.28 ? Math.sin((t / 0.28) * Math.PI) : 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(0, s * 0.06, s * 0.3, s * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#f1c27d'; ctx.lineWidth = s * 0.1; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-s * 0.07, -s * 0.02); ctx.lineTo(-s * 0.07, s * 0.24);
    ctx.moveTo(s * 0.07, -s * 0.02); ctx.lineTo(s * 0.07 + kick * s * 0.34, s * 0.24 - kick * s * 0.18);
    ctx.stroke();
    ctx.fillStyle = '#15171c';
    this.rr(ctx, -s * 0.18, -s * 0.18, s * 0.36, s * 0.2, s * 0.05); ctx.fill();
    ctx.fillStyle = (window.getComputedStyle(document.body).getPropertyValue('--game-accent') || '').trim() || '#eaeaea';
    this.rr(ctx, -s * 0.18, -s * 0.72, s * 0.36, s * 0.56, s * 0.08); ctx.fill();
    ctx.fillStyle = '#f1c27d';
    ctx.beginPath(); ctx.arc(0, -s * 0.84, s * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  /** Advance + draw the ball one frame. Returns true on the frame it lands. */
  drawBall(ctx, ball) {
    ball.t = Math.min(1, ball.t + 1 / ball.dur);
    const e = ball.t;
    const x = ball.x0 + (ball.x1 - ball.x0) * e;
    const yBase = ball.y0 + (ball.y1 - ball.y0) * e;
    const y = yBase - Math.sin(e * Math.PI) * ball.arcH;
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x, yBase, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1.5; ctx.stroke();
    return ball.t >= 1;
  },
};
