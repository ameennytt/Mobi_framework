'use strict';

/**
 * GameVisuals — chase canvas drawing. Builds a ball via ChaseShot (cricket math)
 * and paints it; the arena draws the stadium. Modular gameplay/ layout.
 */
window.GameVisuals = {
  /** Build the active ball from an outcome + geometry (uses window.ChaseShot). */
  buildBall(out, opts) {
    const { W, H, target, overs, roomCode, score } = opts;
    const vis = window.ChaseShot.buildVisual(
      { runs: out.runs, dir: out.dir, dismissed: out.dismissed, name: out.name, score },
      { W, H, tvTarget: target, tvOvers: overs, roomCode }
    );
    const o = vis.origin;
    const land = vis.landing || { landX: W / 2, landGroundY: H * 0.32 };
    return {
      t: 0, dur: (vis.ball && vis.ball.dur) || 48,
      x0: o.bx, y0: o.by, x1: land.landX, y1: land.landGroundY,
      arcH: (vis.ball && vis.ball.arcH) || H * 0.1,
      out, color: (vis.fx && vis.fx.bannerColor) || '#fff',
    };
  },

  /** Advance + paint the ball one frame. Returns true on the frame it lands. */
  drawBall(ctx, ball) {
    ball.t = Math.min(1, ball.t + 1 / ball.dur);
    const e = ball.t;
    const x = ball.x0 + (ball.x1 - ball.x0) * e;
    const yBase = ball.y0 + (ball.y1 - ball.y0) * e;
    const y = yBase - Math.sin(e * Math.PI) * ball.arcH;
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x, yBase, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1.5; ctx.stroke();
    return ball.t >= 1;
  },
};
