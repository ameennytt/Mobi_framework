#!/usr/bin/env node
'use strict';

/**
 * Zero-dependency lint — runs `node --check` (syntax parse) on every project .js
 * (excluding node_modules / generated app / app-template). Fast, no ESLint install.
 *   npm run lint
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const SKIP = new Set(['node_modules', '.git', 'app', 'app-template', 'build', '.gradle', '.cxx']);
const ROOTS = ['framework', 'games', 'scripts'];

function find(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(find(p));
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

let files = [];
for (const r of ROOTS) { const d = path.join(root, r); if (fs.existsSync(d)) files = files.concat(find(d)); }

let bad = 0;
for (const f of files) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { console.error('✗ ' + path.relative(root, f) + '\n' + (e.stderr || e.message)); bad++; }
}
console.log(`${files.length - bad}/${files.length} files OK`);
process.exit(bad ? 1 : 0);
