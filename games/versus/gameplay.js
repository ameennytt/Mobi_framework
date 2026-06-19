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

  function draw(ctx, W, H) {
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
