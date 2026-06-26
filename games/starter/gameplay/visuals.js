'use strict';

/**
 * GameVisuals — canvas drawing only. EDIT THIS to paint your action.
 * Part of the modular gameplay/ layout. The arena draws the stadium; you draw the
 * action on top (object layer).
 */
window.GameVisuals = {
  // ── DRAW ── advance + paint one frame of an action. Returns true when it's done.
  // Demo: a "+N" that rises from the centre and fades.
  drawShot(ctx, shot, W, H) {
    shot.t = Math.min(1, shot.t + 1 / shot.dur);
    const y = H * 0.6 - shot.t * H * 0.18;
    ctx.globalAlpha = 1 - shot.t * 0.4;
    ctx.fillStyle = '#6ee7ff';
    ctx.font = `900 ${Math.round(H * 0.07)}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('+' + shot.pts, W / 2, y);
    ctx.globalAlpha = 1;
    return shot.t >= 1;
  },
};
