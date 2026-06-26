'use strict';

const assert = require('assert');
const RM = require('./room-manager.js');   // singleton

function testGenerateCode() {
  for (let i = 0; i < 50; i++) {
    const c = RM.generateCode();
    assert.ok(/^[A-Z2-9]{4}$/.test(c), 'code is 4 chars from the safe alphabet: ' + c);
  }
}

function testCreateGetDelete() {
  const code = 'TST1';
  const room = RM.createRoom(code);
  assert.strictEqual(room.code, code);
  assert.strictEqual(RM.getRoom('tst1').code, code, 'getRoom is case-insensitive');
  assert.strictEqual(RM.createRoom(code), room, 'createRoom is idempotent');
  assert.ok(RM.deleteRoom(code));
  assert.ok(!RM.getRoom(code), 'deleted room is gone');
}

function testSweepKeepsLive() {
  const r = RM.createRoom('LIVE');
  r.screen = { readyState: 1 };           // a live socket
  r.created = 0; r.lastActivity = 0;      // ancient
  RM.sweep();
  assert.ok(RM.getRoom('LIVE'), 'rooms with a live socket are never culled');
  RM.deleteRoom('LIVE');
}

testGenerateCode();
testCreateGetDelete();
testSweepKeepsLive();
console.log('room-manager.test.js: all passed');
