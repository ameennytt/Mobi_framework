'use strict';

/**
 * Gameplay (entry) — orchestrates the game by composing the modular pieces:
 *   GameRules (decisions) · GameScoring (state) · GameVisuals (drawing).
 * This is the single entry point the framework expects (window.Gameplay with
 * attach/draw/start/setPaired/handlers). The framework doesn't care that the logic
 * is split — load order is declared in game-config.json `code:[]` (index.js last).
 *
 * Demo = "attempt" archetype (score over N tries). Reshape for your sport by editing
 * gameplay/rules.js (outcome), gameplay/visuals.js (drawing), and the flow here.
 */
window.Gameplay = (function () {
  const T = () => window.FrameworkTemplates;
  const A = () => window.FrameworkArena;
  const R = () => window.GameRules;
  const V = () => window.GameVisuals;
  const HUD = 'attempt';                      // scorebar style (chase | versus | attempt)

  let game = null, paired = false, shot = null;
  const score = window.GameScoring.create();

  function start(opts = {}) {
    score.reset(opts.attempts || 5);
    shot = null;
    A().reset();
    T().hideTVResult();
    T().renderScorebar(HUD, { title: 'Score' });
    T().updateScorebar(HUD, score.snapshot());
  }

  function onAction(d) {
    if (!paired || shot || R().isOver(score.used, score.attempts)) return;
    const outcome = R().judge(d);
    shot = { t: 0, dur: 26, pts: outcome.points };
  }

  function resolve() {
    score.add(shot.pts);
    const W = window.FrameworkRenderer.W, H = window.FrameworkRenderer.H;
    A().burst(W / 2, H * 0.55, 'var(--game-accent)', shot.pts >= 8 ? 36 : 16);
    T().showTVBanner('+' + shot.pts, '#6ee7ff');
    shot = null;
    T().updateScorebar(HUD, score.snapshot());
    game.send('game_state', score.snapshot());
    if (R().isOver(score.used, score.attempts)) setTimeout(end, 900);
  }

  function end() {
    const best = score.finalize();
    A().celebrate(score.score > 0);
    game.send('game_over', { score: score.score, best });
    game.showResult({
      bannerText: 'Game Over',
      winner: String(score.score),
      stats: [{ label: 'Score', value: score.score }, { label: 'Best', value: best }, { label: 'Tries', value: score.attempts }],
      primaryText: 'PLAY AGAIN',
      onPrimary: () => { game.hideResult(); start({ attempts: score.attempts }); },
    });
  }

  function draw(ctx, W, H) {
    if (!shot) return;
    if (V().drawShot(ctx, shot, W, H)) resolve();
  }

  function attach(g) { game = g; }

  return {
    attach, draw, start,
    setPaired: (v) => { paired = v; },
    handlers: {
      action: onAction,
      start: (d) => { paired = true; start(d || {}); },
    },
  };
})();
