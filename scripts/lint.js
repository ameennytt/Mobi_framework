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

/*
 * Theme guard — reusable DOM-template JS (framework/ui/*.js) must never hardcode the
 * CricSwing-green identity; it has to reference a theme token so a game's `theme`
 * recolors all chrome (see DOC + framework/ui/framework.css). Canvas art
 * (framework/renderer/*) is exempt: ctx colors resolve CSS vars via getComputedStyle.
 */
const GREEN = [
  /rgba\(\s*154\s*,\s*223\s*,\s*107/i,   // --game-accent (#9ADF6B)
  /rgba\(\s*118\s*,\s*185\s*,\s*0/i,     // --game-secondary (#76B900)
  /#9ADF6B/i, /#76B900/i, /#aee9c0/i,
];
const uiDir = path.join(root, 'framework', 'ui');
let themeBad = 0;
if (fs.existsSync(uiDir)) {
  for (const e of fs.readdirSync(uiDir)) {
    if (!e.endsWith('.js')) continue;
    const p = path.join(uiDir, e);
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    lines.forEach((ln, i) => {
      if (GREEN.some(re => re.test(ln))) {
        console.error(`✗ ${path.relative(root, p)}:${i + 1} hardcoded brand color — use a --game-* token`);
        console.error('  ' + ln.trim());
        themeBad++;
      }
    });
  }
}

console.log(`${files.length - bad}/${files.length} files OK` + (themeBad ? ` · ${themeBad} theme violation(s)` : ' · theme clean'));
process.exit(bad || themeBad ? 1 : 0);
