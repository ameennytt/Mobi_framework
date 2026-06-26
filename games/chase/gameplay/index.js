'use strict';

/**
 * Gameplay (entry) — orchestrates the chase by composing GameRules (decisions),
 * GameScoring (state), GameVisuals (ball draw via ChaseShot). Single entry point
 * the framework expects (window.Gameplay). Load order in game-config.json `code:[]`
 * (chase-shot.js + the modules; index.js last).
 *
 * Demo rolls a random outcome; swap GameRules.roll for real rules / swing input
 * without touching scoring, visuals, or the framework.
 */
window.Gameplay = (function () {
  const T = () => window.FrameworkTemplates;
  const A = () => window.FrameworkArena;
  const R = () => window.GameRules;
  const V = () => window.GameVisuals;

  let game = null, paired = false, difficulty = 'medium', ball = null, title = 'Chase';
  const score = window.GameScoring.create();

  function onAction(d) {
    if (!paired || ball || R().isFinished(score)) return;
    const out = R().roll((d && d.choice) || 'center', difficulty);
    const W = window.FrameworkRenderer.W, H = window.FrameworkRenderer.H;
    ball = V().buildBall(out, { W, H, target: score.target, overs: score.overs, roomCode: game.getCode(), score: score.snapshot() });
  }

  function land() {
    const out = ball.out;
    score.apply(out);
    A().burst(ball.x1, ball.y1, ball.color, out.runs >= 6 ? 55 : out.runs >= 4 ? 32 : 14);
    if (out.runs >= 4) A().cheer(160);
    T().showTVBanner(out.name, ball.color);
    T().updateTVScorebar(score.snapshot());
    game.send('game_state', score.snapshot());
    ball = null;
    if (R().isFinished(score)) setTimeout(end, 1100);
  }

  function end() {
    const won = R().won(score);
    A().celebrate(won);
    game.send('game_over', { runs: score.runs, wickets: score.wickets, won });
    T().showTVBanner(won ? 'YOU WON!' : 'CHASE OVER', won ? '#ffd700' : '#ff6688');
    setTimeout(() => {
      game.showResult({
        won,
        bannerText: won ? 'Victory' : 'Chase Fell Short',
        winner: `${score.runs}/${score.wickets}`,
        stats: [
          { label: 'Runs', value: score.runs },
          { label: 'Target', value: score.target || '—' },
          { label: 'Overs', value: `${Math.floor(score.balls / 6)}.${score.balls % 6}` },
        ],
        primaryText: 'PLAY AGAIN',
        onPrimary: () => { game.hideResult(); start({ target: score.target, overs: score.overs, difficulty }); },
      });
    }, won ? 1800 : 1100);
  }

  function start(opts = {}) {
    difficulty = opts.difficulty || 'medium';
    score.reset({ target: opts.target || 0, overs: opts.overs || 0 });
    ball = null;
    A().reset();
    T().hideTVResult();
    T().renderTVScorebar({ title, chasingLabel: score.target ? `Target ${score.target}` : 'Free Play' });
    T().updateTVScorebar(score.snapshot());
  }

  function draw(ctx, W, H) {
    if (!ball) return;
    if (V().drawBall(ctx, ball)) land();
  }

  function attach(g) { game = g; try { title = g.text('APP_TITLE') || 'Chase'; } catch (_) {} }

  return {
    attach, draw, start,
    setPaired: (v) => { paired = v; },
    handlers: {
      action: onAction,
      start: (d) => { paired = true; start(d || {}); },
    },
  };
})();
