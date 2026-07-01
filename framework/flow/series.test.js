'use strict';

/**
 * Tests for FrameworkSeries (series/tournament state machine). Runs in plain node:
 * we stub window + an in-memory FrameworkStorage, then require the module.
 */
const assert = require('assert');

// Minimal in-memory storage stub matching the FrameworkStorage surface series.js uses.
const mem = new Map();
global.window = {
  FrameworkStorage: {
    load: (k) => (mem.has(k) ? mem.get(k) : null),
    save: (k, v) => { mem.set(k, v); },
    remove: (k) => { mem.delete(k); },
    monitor: () => {},
  },
};

const Series = require('./series.js');
Series.init('test');

// ── series: best of 3 ──────────────────────────────────────────────────────
Series.start({ type: 'series', bestOf: 3 });
let s = Series.standings();
assert.strictEqual(s.label, 'Match 1 of 3', 'fresh series label');
assert.strictEqual(s.done, false, 'fresh series not done');

Series.recordResult(true);
assert.strictEqual(Series.current().matchNum, 2, 'advance to match 2 after a win');
assert.strictEqual(Series.current().userWins, 1, 'one user win recorded');

Series.recordResult(true);            // 2 wins = majority of 3 → done
s = Series.standings();
assert.strictEqual(s.done, true, 'series done after 2 wins');
assert.strictEqual(s.won, true, 'user won the series');

// ── series: lose it ────────────────────────────────────────────────────────
Series.start({ type: 'series', bestOf: 3 });
Series.recordResult(false);
Series.recordResult(false);
s = Series.standings();
assert.strictEqual(s.done, true, 'series done after 2 losses');
assert.strictEqual(s.won, false, 'user lost the series');

// ── tournament: one loss ends the run ──────────────────────────────────────
Series.start({ type: 'tournament', total: 3 });
Series.recordResult(false);
s = Series.standings();
assert.strictEqual(s.done, true, 'knockout ends on a loss');
assert.strictEqual(s.won, false, 'eliminated');
assert.strictEqual(s.label, 'Eliminated', 'eliminated label');

// ── tournament: survive the bracket = champion ─────────────────────────────
Series.start({ type: 'tournament', total: 3 });
Series.recordResult(true);            // round 1 → 2
assert.strictEqual(Series.current().matchNum, 2, 'advance to round 2');
Series.recordResult(true);            // round 2 → 3
Series.recordResult(true);            // round 3 = final → champion
s = Series.standings();
assert.strictEqual(s.done, true, 'tournament complete');
assert.strictEqual(s.won, true, 'champion');
assert.strictEqual(s.label, 'Champion!', 'champion label');

// ── results[] history (drives the match-end dots) ──────────────────────────
Series.start({ type: 'series', bestOf: 3 });
Series.recordResult(true);
Series.recordResult(false);
s = Series.standings();
assert.deepStrictEqual(s.results, ['win', 'loss'], 'results[] records each match in order');

// ── clear ──────────────────────────────────────────────────────────────────
Series.clear();
assert.strictEqual(Series.isOver(), true, 'no series after clear');
assert.strictEqual(Series.standings(), null, 'no standings after clear');

console.log('series.test.js: all passed');
