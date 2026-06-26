'use strict';

const assert = require('assert');
const P = require('./projectile.js');

const W = 1920, H = 1080;

function testPerspective() {
  const k = P.perspective(W, H);
  assert.strictEqual(k.cx, W / 2);
  assert.strictEqual(k.horizY, H * 0.30);
  assert.strictEqual(k.nearY, H * 0.83);
}

function testDeterministicRng() {
  const seed = P.hashSeed('ROOM:1:6:off');
  const a = P.mulberry32(seed), b = P.mulberry32(seed);
  assert.strictEqual(a(), b(), 'same seed → same sequence');
}

function testBoundaryHit() {
  const hit = P.ropeHit(W, H, W / 2, H * 0.83, 0, -1);   // straight up from the striker
  assert.ok(hit && typeof hit.x === 'number' && typeof hit.y === 'number', 'ray meets the rope');
  assert.strictEqual(P.boundaryHit, P.ropeHit, 'boundaryHit is the neutral alias');
}

function testArc() {
  const a = P.arc(1, W, H);
  assert.ok(a.dur > 0 && a.arcH > 0 && a.big === true);
}

testPerspective();
testDeterministicRng();
testBoundaryHit();
testArc();
console.log('projectile.test.js: all passed');
