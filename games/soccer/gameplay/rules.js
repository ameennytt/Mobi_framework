'use strict';

/**
 * GameRules — pure decision logic for the head-to-head shootout (no DOM, no canvas).
 *
 * Part of the MODULAR game layout (gameplay/ + extensions/). Split out so rules can
 * be unit-tested and swapped (e.g. real physics or an ML model later) without
 * touching scoring, visuals, or the orchestrator (index.js). Loaded before index.js
 * via game-config.json `code: [...]`. Exposes window.GameRules.
 */
window.GameRules = {
  // keeper save chance · CPU score chance, per difficulty
  SAVE_P: { easy: 0.25, medium: 0.40, hard: 0.55 },
  CPU_P:  { easy: 0.40, medium: 0.50, hard: 0.62 },

  /** Does the keeper save the player's shot? */
  judgeShot(difficulty) {
    return { saved: Math.random() < (this.SAVE_P[difficulty] != null ? this.SAVE_P[difficulty] : 0.4) };
  },

  /** Does the CPU score on its reply shot? */
  cpuScores(difficulty) {
    return Math.random() < (this.CPU_P[difficulty] != null ? this.CPU_P[difficulty] : 0.5);
  },

  isFinished(round, rounds) { return round >= rounds; },

  /** 'win' | 'draw' | 'loss' from the player's perspective. */
  result(you, cpu) { return you > cpu ? 'win' : you === cpu ? 'draw' : 'loss'; },
};

// Node-importable too, so rules can be unit-tested headless.
if (typeof module !== 'undefined' && module.exports) { module.exports = window.GameRules; }
