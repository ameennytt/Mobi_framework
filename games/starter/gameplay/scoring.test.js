'use strict';

// GameScoring attaches to window in the browser; stub it for a headless require.
const assert = require('assert');
global.window = global.window || {};
require('./scoring.js');
const GameScoring = global.window.GameScoring;

function test() {
  const s = GameScoring.create();
  s.reset(3);
  assert.deepStrictEqual(s.snapshot(), { score: 0, attempts: 3, attempt: 0, left: 3, best: 0 });
  s.add(5); s.add(2);
  const snap = s.snapshot();
  assert.strictEqual(snap.score, 7);
  assert.strictEqual(snap.attempt, 2);
  assert.strictEqual(snap.left, 1);
  const best = s.finalize();
  assert.strictEqual(best, 7, 'best tracks the high score');
  s.reset(3);
  assert.strictEqual(s.snapshot().score, 0, 'reset clears score');
}

test();
console.log('scoring.test.js: all passed');
