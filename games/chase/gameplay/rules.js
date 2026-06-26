'use strict';

/**
 * GameRules — pure chase decision logic (no DOM/canvas). EDIT for your real rules.
 * Modular gameplay/ layout; loaded before index.js via game-config.json `code:[]`.
 */
window.GameRules = {
  MAX_WICKETS: 10,
  DIR: { left: 'leg', center: 'str', right: 'off' },

  // ── outcome roll (demo: random; swap for real rules / swing later) ──
  roll(choice, difficulty) {
    const dir = this.DIR[choice] || 'str';
    const r = Math.random();
    const aggr = difficulty === 'hard' ? 0.16 : difficulty === 'easy' ? 0.05 : 0.10;
    if (r < aggr) return this.mk(0, dir, true);              // wicket
    if (r < aggr + 0.20) return this.mk(0, dir, false);      // dot
    if (r < aggr + 0.45) return this.mk(1, dir, false);
    if (r < aggr + 0.60) return this.mk(2, dir, false);
    if (r < aggr + 0.68) return this.mk(3, dir, false);
    if (r < aggr + 0.86) return this.mk(4, choice === 'center' ? 'str' : dir, false);
    return this.mk(6, choice === 'center' ? 'lofted' : dir, false);
  },
  mk(runs, dir, dismissed) {
    const name = dismissed ? 'OUT!' : runs === 6 ? 'SIX!' : runs === 4 ? 'FOUR!'
      : runs === 3 ? 'THREE' : runs === 2 ? 'TWO' : runs === 1 ? 'ONE' : 'DOT BALL';
    return { runs, dir, dismissed, name };
  },

  isFinished(s) {
    if (!s.overs) return false;
    if (s.target && s.runs >= s.target) return true;
    if (s.wickets >= this.MAX_WICKETS) return true;
    return s.balls >= s.overs * 6;
  },
  won(s) { return s.target ? s.runs >= s.target : false; },
};

if (typeof module !== 'undefined' && module.exports) { module.exports = window.GameRules; }
