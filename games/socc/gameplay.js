'use strict';

/**
 * Striker Duel — sample gameplay for the HEAD-TO-HEAD (versus) archetype.
 *
 * Single phone = you vs CPU. Each tap shoots at the goal (aim left/center/right);
 * the keeper dives; goal or save. Then the CPU takes its shot. Both scores shown
 * on the `versus` HUD. Most goals after N rounds wins. Same framework everything —
 * only this file + game-config.json differ from the cricket `chase` game.
 *
 * Reuses: FrameworkArena (stadium + 'goal' field overlay + particles/celebrate),
 * ShotVisuals.perspective (goal geometry), FrameworkTemplates (versus HUD + banner
 * + result). window.Gameplay.
 */
window.Gameplay = (function () {
  const T = () => window.FrameworkTemplates;
  const A = () => window.FrameworkArena;
  const HUD = 'versus';

  let game = null, paired = false, difficulty = 'medium';
  let you = 0, cpu = 0, round = 0, rounds = 5;
  let ball = null, title = 'Striker Duel';

  const SAVE_P = { easy: 0.25, medium: 0.40, hard: 0.55 };
  const CPU_P = { easy: 0.40, medium: 0.50, hard: 0.62 };

  function onAction(d) {
    if (!paired || ball || finished()) return;
    const aim = (d && d.choice) || 'center';
    const W = window.FrameworkRenderer.W, H = window.FrameworkRenderer.H;
    const p = window.ShotVisuals.perspective(W, H);
    const gy = p.horizY + (p.nearY - p.horizY) * 0.34;        // goal line (matches fields.goal)
    const gw = W * 0.20;
    const targetX = p.cx + (aim === 'left' ? -gw * 0.32 : aim === 'right' ? gw * 0.32 : 0);
    const saved = Math.random() < SAVE_P[difficulty];
    ball = {
      t: 0, dur: 40,
      x0: p.cx, y0: p.nearY - 10,
      x1: saved ? p.cx + (Math.random() * 2 - 1) * gw * 0.2 : targetX,
      y1: gy + (saved ? 14 : -4),
      arcH: H * 0.10, saved,
    };
    // Keeper dive plan: reach the ball on a save, dive the wrong way on a goal.
    const wrong = aim === 'left' ? gw * 0.34 : aim === 'right' ? -gw * 0.34 : (Math.random() < 0.5 ? -1 : 1) * gw * 0.34;
    ball.keeperFrom = p.cx;
    ball.keeperTo = saved ? ball.x1 : p.cx + wrong;
  }

  function resolveRound() {
    const scored = !ball.saved;
    A().burst(ball.x1, ball.y1, scored ? '#39ff14' : '#ff5566', scored ? 36 : 12);
    if (scored) { you++; A().cheer(140); }
    T().showTVBanner(scored ? 'GOAL!' : 'SAVED!', scored ? '#39ff14' : '#ff5566');
    // CPU takes its shot (instant)
    const cpuScored = Math.random() < CPU_P[difficulty];
    if (cpuScored) cpu++;
    round++;
    ball = null;
    T().updateScorebar(HUD, { you, cpu, round, rounds });
    game.send('game_state', { you, cpu, round, rounds, scored, cpuScored });
    if (finished()) setTimeout(endGame, 1200);
  }

  function finished() { return round >= rounds; }

  function endGame() {
    const won = you > cpu;
    A().celebrate(won);
    T().showTVBanner(won ? 'YOU WIN!' : you === cpu ? 'DRAW' : 'YOU LOSE', won ? '#39ff14' : '#ff8866');
    game.send('game_over', { you, cpu, won });
    setTimeout(() => {
      game.showResult({
        bannerText: won ? 'Full Time — Win' : you === cpu ? 'Full Time — Draw' : 'Full Time — Loss',
        winner: `${you} - ${cpu}`,
        stats: [
          { label: 'You', value: you },
          { label: 'CPU', value: cpu },
          { label: 'Rounds', value: rounds },
        ],
        primaryText: 'PLAY AGAIN',
        onPrimary: () => { game.hideResult(); start({ rounds, difficulty }); },
      });
    }, won ? 1700 : 1100);
  }

  function start(opts = {}) {
    rounds = opts.rounds || 5;
    difficulty = opts.difficulty || 'medium';
    you = 0; cpu = 0; round = 0; ball = null;
    A().reset();
    T().hideTVResult();
    T().renderScorebar(HUD, { titleA: 'You', titleB: 'CPU' });
    T().updateScorebar(HUD, { you, cpu, round, rounds });
  }

  // Rounded-rect path helper.
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Goalkeeper at the goal line — stands at centre, dives left/right during a shot.
  function drawKeeper(ctx, x, y, H, t, diveDX) {
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
    rr(ctx, -s * 0.18, -s * 0.7, s * 0.36, s * 0.62, s * 0.1); ctx.fill();
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
  }

  // Shooter (back to camera) near the spot — kicks as the ball launches.
  function drawShooter(ctx, x, y, H, t) {
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
    rr(ctx, -s * 0.18, -s * 0.18, s * 0.36, s * 0.2, s * 0.05); ctx.fill();
    ctx.fillStyle = window.getComputedStyle(document.body).getPropertyValue('--game-accent').trim() || '#eaeaea';
    rr(ctx, -s * 0.18, -s * 0.72, s * 0.36, s * 0.56, s * 0.08); ctx.fill();
    ctx.fillStyle = '#f1c27d';
    ctx.beginPath(); ctx.arc(0, -s * 0.84, s * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function draw(ctx, W, H) {
    const p = window.ShotVisuals.perspective(W, H);
    const gy = p.horizY + (p.nearY - p.horizY) * 0.34;     // goal line (matches fields.goal)

    const kx = ball ? ball.keeperFrom + (ball.keeperTo - ball.keeperFrom) * ball.t : p.cx;
    drawKeeper(ctx, kx, gy, H, ball ? ball.t : 0, ball ? (ball.keeperTo - ball.keeperFrom) : 0);

    drawShooter(ctx, p.cx, p.nearY - H * 0.04, H, ball ? ball.t : 0);

    if (!ball) return;
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
    if (ball.t >= 1) resolveRound();
  }

  function attach(g) { game = g; try { title = g.text('APP_TITLE') || title; } catch (_) {} }

  return {
    attach, draw, start,
    setPaired: (v) => { paired = v; },
    handlers: {
      action: onAction,
      start: (d) => { paired = true; start(d || {}); },
    },
  };
})();
