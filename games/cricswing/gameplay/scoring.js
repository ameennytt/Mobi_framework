'use strict';

/**
 * GameScoring — chase score state (runs/balls/wickets + target/overs).
 * Modular gameplay/ layout. create() returns an isolated scoreboard.
 */
window.GameScoring = {
  create() {
    let runs = 0, balls = 0, wickets = 0, target = 0, overs = 0, boundaries = 0;
    return {
      reset(o = {}) { runs = 0; balls = 0; wickets = 0; boundaries = 0; target = o.target || 0; overs = o.overs || 0; },
      restore(s) { if (!s) return; runs = s.runs || 0; balls = s.balls || 0; wickets = s.wickets || 0; boundaries = s.boundaries || 0; target = s.target || 0; overs = s.overs || 0; },
      apply(out) { balls++; if (out.dismissed) wickets++; else { runs += out.runs; if (out.runs >= 4) boundaries++; } },
      get runs() { return runs; },
      get balls() { return balls; },
      get wickets() { return wickets; },
      get boundaries() { return boundaries; },
      get target() { return target; },
      get overs() { return overs; },
      // strike rate = runs per 100 balls (0 when no balls faced yet)
      get strikeRate() { return balls ? Math.round((runs / balls) * 1000) / 10 : 0; },
      snapshot() { return { runs, balls, wickets, boundaries, target, overs, strikeRate: balls ? Math.round((runs / balls) * 1000) / 10 : 0 }; },
    };
  },
};

if (typeof module !== 'undefined' && module.exports) { module.exports = window.GameScoring; }
