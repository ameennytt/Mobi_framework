'use strict';

/**
 * GameRules — pure decision logic (no DOM, no canvas). EDIT THIS for your sport.
 * Part of the modular gameplay/ layout; loaded before index.js via config `code:[]`.
 */
window.GameRules = {
  // ── GAME RULE ── decide an input's outcome. Demo: random 1–10 points.
  // `payload` is whatever controller.html sent in game.send('action', payload).
  judge(payload) {
    return { points: 1 + Math.floor(Math.random() * 10) };
  },

  isOver(used, attempts) { return used >= attempts; },
};

if (typeof module !== 'undefined' && module.exports) { module.exports = window.GameRules; }
