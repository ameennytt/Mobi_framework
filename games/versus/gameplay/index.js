'use strict';

/**
 * Gameplay (entry) — orchestrates the head-to-head shootout by composing the
 * modular pieces: GameRules (decisions), GameScoring (score state), GameVisuals
 * (drawing). This is the single entry point the framework expects (window.Gameplay
 * with attach/draw/start/setPaired/handlers); the framework neither knows nor cares
 * that the logic is split across gameplay/.
 *
 * MODULAR LAYOUT (officially supported — see DEVELOPER_GUIDE.md "Modular games"):
 *   gameplay/rules.js     window.GameRules     pure decision logic
 *   gameplay/scoring.js   window.GameScoring   score model
 *   gameplay/visuals.js   window.GameVisuals   canvas drawing
 *   gameplay/index.js     window.Gameplay      THIS — wires them + game flow
 *   extensions/           opt-in add-ons (ml / training / tournament / analytics)
 * Load order is declared in game-config.json `code: [...]` (index.js last).
 */
window.Gameplay = (function () {
  const T = () => window.FrameworkTemplates;
  const A = () => window.FrameworkArena;
  const V = () => window.GameVisuals;
  const R = () => window.GameRules;
  const HUD = 'versus';

  let game = null, paired = false, difficulty = 'medium';
  let ball = null, title = 'Striker Duel';
  const score = window.GameScoring.create();

  function onAction(d) {
    if (!paired || ball || R().isFinished(score.round, score.rounds)) return;
    const aim = (d && d.choice) || 'center';
    const W = window.FrameworkRenderer.W, H = window.FrameworkRenderer.H;
    const { p, gy, gw } = V().geometry(W, H);
    const { saved } = R().judgeShot(difficulty);
    const targetX = p.cx + (aim === 'left' ? -gw * 0.32 : aim === 'right' ? gw * 0.32 : 0);
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
    if (scored) { score.goal(); A().cheer(140); }
    T().showTVBanner(scored ? 'GOAL!' : 'SAVED!', scored ? '#39ff14' : '#ff5566');
    if (R().cpuScores(difficulty)) score.cpuGoal();   // CPU reply shot (instant)
    score.next();
    ball = null;
    T().updateScorebar(HUD, score.snapshot());
    game.send('game_state', Object.assign({ scored }, score.snapshot()));
    if (R().isFinished(score.round, score.rounds)) setTimeout(endGame, 1200);
  }

  function endGame() {
    const r = R().result(score.you, score.cpu);
    const won = r === 'win';
    A().celebrate(won);
    T().showTVBanner(won ? 'YOU WIN!' : r === 'draw' ? 'DRAW' : 'YOU LOSE', won ? '#39ff14' : '#ff8866');
    game.send('game_over', { you: score.you, cpu: score.cpu, won });
    setTimeout(() => {
      game.showResult({
        won,
        bannerText: won ? 'Full Time — Win' : r === 'draw' ? 'Full Time — Draw' : 'Full Time — Loss',
        winner: `${score.you} - ${score.cpu}`,
        stats: [
          { label: 'You', value: score.you },
          { label: 'CPU', value: score.cpu },
          { label: 'Rounds', value: score.rounds },
        ],
        primaryText: 'PLAY AGAIN',
        onPrimary: () => { game.hideResult(); start({ rounds: score.rounds, difficulty }); },
      });
    }, won ? 1700 : 1100);
  }

  function start(opts = {}) {
    difficulty = opts.difficulty || 'medium';
    score.reset(opts.rounds || 5);
    ball = null;
    A().reset();
    T().hideTVResult();
    T().renderScorebar(HUD, { titleA: 'You', titleB: 'CPU' });
    T().updateScorebar(HUD, score.snapshot());
  }

  function draw(ctx, W, H) {
    const { p, gy } = V().geometry(W, H);
    const kx = ball ? ball.keeperFrom + (ball.keeperTo - ball.keeperFrom) * ball.t : p.cx;
    V().drawKeeper(ctx, kx, gy, H, ball ? ball.t : 0, ball ? (ball.keeperTo - ball.keeperFrom) : 0);
    V().drawShooter(ctx, p.cx, p.nearY - H * 0.04, H, ball ? ball.t : 0);
    if (!ball) return;
    if (V().drawBall(ctx, ball)) resolveRound();
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
