'use strict';

const assert = require('assert');
const SV = require('./shot-visuals.js');

const W = 1920;
const H = 1080;

function testPerspective() {
  const k = SV.perspective(W, H);
  assert.strictEqual(k.cx, W / 2);
  assert.strictEqual(k.horizY, H * 0.30);
  assert.strictEqual(k.nearY, H * 0.83);
}

function testDeterministicLanding() {
  const msg = { runs: 6, dir: 'off' };
  const seed = SV.hashSeed('ROOM:12:6:off');
  const rng = SV.mulberry32(seed);
  const a = SV.computeShotLanding(msg, W, H, 'right', rng);
  const rng2 = SV.mulberry32(seed);
  const b = SV.computeShotLanding(msg, W, H, 'right', rng2);
  assert.strictEqual(a.landX, b.landX);
  assert.strictEqual(a.landGroundY, b.landGroundY);
}

function testBuildVisualSix() {
  const msg = {
    runs: 6,
    dir: 'off',
    dismissed: false,
    name: 'SIX!',
    score: { runs: 6, wickets: 0, balls: 1 },
  };
  const v = SV.buildVisual(msg, {
    W, H, batHandedness: 'right', tvTarget: 120, tvOvers: 20, roomCode: 'ABC123',
  });
  assert.ok(v.origin.bx > 0);
  assert.ok(v.landing.landX);
  assert.strictEqual(v.ball.dur, 66);
  assert.strictEqual(v.ball.big, true);
  assert.ok(v.fx.particleCount > 0);
}

function testBuildVisualCaught() {
  const msg = {
    runs: 0,
    dir: 'off',
    dismissed: true,
    dismissalType: 'caught',
    name: 'CAUGHT!',
    score: { runs: 10, wickets: 1, balls: 8 },
  };
  const v = SV.buildVisual(msg, { W, H, batHandedness: 'right', tvTarget: 50, tvOvers: 5, roomCode: 'X' });
  assert.strictEqual(v.dismissal.type, 'caught');
  assert.strictEqual(v.dismissal.fielderIndex, 2);
  assert.ok(v.wheelRay.dismissed);
}

testPerspective();
testDeterministicLanding();
testBuildVisualSix();
testBuildVisualCaught();
console.log('shot-visuals.test.js: all passed');
