'use strict';

/**
 * GameScoring — owns the score state. Part of the modular gameplay/ layout.
 * create() returns an isolated scoreboard the orchestrator (index.js) drives.
 */
window.GameScoring = {
  create() {
    let score = 0, attempts = 5, used = 0, best = 0;
    return {
      reset(a) { score = 0; attempts = a || 5; used = 0; },
      add(pts) { score += pts; used++; },
      finalize() { best = Math.max(best, score); return best; },
      get score() { return score; },
      get attempts() { return attempts; },
      get used() { return used; },
      get best() { return best; },
      snapshot() { return { score, attempts, attempt: used, left: attempts - used, best }; },
    };
  },
};

if (typeof module !== 'undefined' && module.exports) { module.exports = window.GameScoring; }
