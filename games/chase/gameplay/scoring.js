'use strict';

/**
 * GameScoring — chase score state (runs/balls/wickets + target/overs).
 * Modular gameplay/ layout. create() returns an isolated scoreboard.
 */
window.GameScoring = {
  create() {
    let runs = 0, balls = 0, wickets = 0, target = 0, overs = 0;
    return {
      reset(o = {}) { runs = 0; balls = 0; wickets = 0; target = o.target || 0; overs = o.overs || 0; },
      restore(s) { if (!s) return; runs = s.runs || 0; balls = s.balls || 0; wickets = s.wickets || 0; target = s.target || 0; overs = s.overs || 0; },
      apply(out) { balls++; if (out.dismissed) wickets++; else runs += out.runs; },
      get runs() { return runs; },
      get balls() { return balls; },
      get wickets() { return wickets; },
      get target() { return target; },
      get overs() { return overs; },
      snapshot() { return { runs, balls, wickets, target, overs }; },
    };
  },
};

if (typeof module !== 'undefined' && module.exports) { module.exports = window.GameScoring; }
