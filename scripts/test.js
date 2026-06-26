#!/usr/bin/env node
'use strict';

/**
 * Test runner — finds every *.test.js (excluding node_modules / app / app-template)
 * and runs each in a child node process. Exits non-zero if any fail.
 *   npm test
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const SKIP = new Set(['node_modules', '.git', 'app', 'app-template', 'build', '.gradle']);

function find(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(find(p));
    else if (e.name.endsWith('.test.js')) out.push(p);
  }
  return out;
}

const tests = find(root);
if (!tests.length) { console.log('No tests found.'); process.exit(0); }

let failed = 0;
for (const t of tests) {
  const rel = path.relative(root, t);
  try {
    execFileSync(process.execPath, [t], { stdio: 'inherit' });
  } catch (_) {
    console.error(`FAILED: ${rel}`);
    failed++;
  }
}
console.log(`\n${tests.length - failed}/${tests.length} test file(s) passed.`);
process.exit(failed ? 1 : 0);
