'use strict';

/**
 * GameScoring — owns the match score state (you / cpu / round / rounds).
 *
 * Part of the MODULAR game layout. Kept separate from rules + visuals so the
 * scoreboard model has one home. `create()` returns an isolated scoreboard the
 * orchestrator (index.js) drives. Loaded before index.js via config `code: [...]`.
 * Exposes window.GameScoring.
 */
window.GameScoring = {
  create() {
    let you = 0, cpu = 0, round = 0, rounds = 5;
    return {
      reset(r) { you = 0; cpu = 0; round = 0; rounds = r || 5; },
      restore(s) { if (!s) return; you = s.you || 0; cpu = s.cpu || 0; round = s.round || 0; rounds = s.rounds || rounds; },
      goal() { you++; },
      cpuGoal() { cpu++; },
      next() { round++; },
      get you() { return you; },
      get cpu() { return cpu; },
      get round() { return round; },
      get rounds() { return rounds; },
      snapshot() { return { you, cpu, round, rounds }; },
    };
  },
};

if (typeof module !== 'undefined' && module.exports) { module.exports = window.GameScoring; }
