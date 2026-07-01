'use strict';

/**
 * Gameplay (entry) — orchestrates the game by composing the modular pieces:
 *   GameRules (decisions) · GameScoring (state) · GameVisuals (drawing).
 * This is the single entry point the framework expects (window.Gameplay with
 * attach/draw/start/setPaired/handlers). The framework doesn't care that the logic
 * is split — load order is declared in game-config.json `code:[]` (index.js last).
 *
 * Flat template uses the GENERIC 'flat' HUD — 3 placeholder slots with developer
 * names (SLOT 1/2/3) so a new game shows clearly-labelled boxes to rename. Swap HUD
 * to 'chase' (cricket), 'versus' (football), or 'attempt', or relabel the slots.
 * Reshape for your sport via gameplay/rules.js · visuals.js · the flow here.
 */
window.Gameplay = (function () {
  const T = () => window.FrameworkTemplates;
  const A = () => window.FrameworkArena;
  const R = () => window.GameRules;
  const V = () => window.GameVisuals;
  const HUD = 'flat';                          // scorebar style (chase | versus | attempt | flat)
  // Map this game's snapshot → the 3 generic slots. Rename labels + values per sport.
  const slots = (s) => ({ labels: ['SLOT 1', 'SLOT 2', 'SLOT 3'], slots: [s.score, s.best, s.left] });

  let game = null, paired = false, shot = null;
  const score = window.GameScoring.create();

  function start(opts = {}) {
    score.reset(opts.attempts || 5);
    shot = null;
    A().reset();
    T().hideTVResult();
    const sv = slots(score.snapshot());
    T().renderScorebar(HUD, sv);
    T().updateScorebar(HUD, sv);
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
    T().updateScorebar(HUD, slots(score.snapshot()));
    game.send('game_state', score.snapshot());
    if (R().isOver(score.used, score.attempts)) setTimeout(end, 900);
  }

  function end() {
    const best = score.finalize();
    A().celebrate(score.score > 0);
    game.send('game_over', { score: score.score, best });
    game.showResult({
      won: score.score > 0,
      bannerText: 'Game Over',
      winner: String(score.score),
      stats: [{ label: 'Score', value: score.score }, { label: 'Best', value: best }, { label: 'Tries', value: score.attempts }],
      // TV result is display-only — the phone drives Play Again / Home (no dead TV button).
      sub: 'Play again on your phone',
    });
  }

  // Restore an in-progress game from the saved snapshot (reconnect/reload), no reset.
  function resume() {
    const s = game.loadSavedState();
    if (!s) { start({}); return; }
    score.restore(s);
    shot = null;
    A().reset();
    T().hideTVResult();
    const sv = slots(score.snapshot());
    T().renderScorebar(HUD, sv);
    T().updateScorebar(HUD, sv);
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
      resume: () => { paired = true; resume(); },
    },
  };
})();
