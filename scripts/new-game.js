#!/usr/bin/env node
'use strict';

/**
 * Scaffold a new game by copying a template.
 *
 * Usage:
 *   npm run new-game <id>                 # minimal preset: buttons + pair→pick→play
 *   npm run new-game <id> --from chase    # broadcast preset: full CricSwing-style screens
 *
 * Presets (templates) = how many optional screens are on (see DOC/SCREENS.md):
 *   starter = minimal (buttons)   chase = broadcast (onboarding/series/toss/intro/over-summary)
 *   versus  = head-to-head (football)
 *
 * Rewrites paths, storage keys, and gameId so the copy runs immediately.
 */
const fs = require('fs');
const path = require('path');

const KNOWN = ['starter', 'chase', 'versus'];

const args = process.argv.slice(2);
const id = (args.find(a => !a.startsWith('-')) || '').trim();
const fromIdx = args.indexOf('--from');

if (!/^[a-z][a-z0-9-]{1,30}$/.test(id)) {
  console.error('Usage: npm run new-game <id> [--from starter|chase|versus]');
  console.error('  <id>: lowercase letters/digits/dashes, starts with a letter (e.g. tennis, air-hockey)');
  process.exit(1);
}

// Resolve the template, but FAIL LOUD on a typo'd/empty --from so a football/cricket
// game can never silently fall back to the blank starter shell.
// `npm run` swallows `--from versus` into the env var npm_config_from (unless you
// use `npm run new-game -- <id> --from versus`), so accept that too.
function bad(template) {
  if (!template || template.startsWith('-')) {
    console.error('--from needs a template name. Pick one: ' + KNOWN.join(' | '));
    process.exit(1);
  }
  if (!KNOWN.includes(template)) {
    console.error(`Unknown template "${template}". Pick one: ${KNOWN.join(' | ')}`);
    console.error('  chase = cricket-style · versus = football (head-to-head) · starter = blank shell');
    process.exit(1);
  }
}

let template;
const envFrom = (process.env.npm_config_from || '').trim();   // set by `npm run … --from x`
if (fromIdx !== -1) {
  template = (args[fromIdx + 1] || '').trim();
  bad(template);
} else if (envFrom) {
  template = envFrom;
  bad(template);
} else {
  template = 'starter';
  console.warn('NOTE: no --from given → using the minimal "starter" preset (buttons).');
  console.warn('      Broadcast/full screens: --from chase   ·   head-to-head: --from versus');
  console.warn('      Optional screens + config flags: see DOC/SCREENS.md');
}

const root = path.join(__dirname, '..');
const src = path.join(root, 'games', template);
const dest = path.join(root, 'games', id);

if (!fs.existsSync(src)) { console.error(`Missing template games/${template}.`); process.exit(1); }
if (fs.existsSync(dest)) { console.error(`games/${id} already exists — pick another id.`); process.exit(1); }

function copyDir(s, d) {
  fs.mkdirSync(d, { recursive: true });
  for (const e of fs.readdirSync(s, { withFileTypes: true })) {
    const sp = path.join(s, e.name);
    const dp = path.join(d, e.name);
    if (e.isDirectory()) copyDir(sp, dp);
    else fs.copyFileSync(sp, dp);
  }
}
copyDir(src, dest);

const exts = new Set(['.html', '.json', '.js', '.css']);
function rewrite(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { rewrite(p); continue; }
    if (!exts.has(path.extname(e.name))) continue;
    let t = fs.readFileSync(p, 'utf8');
    t = t.split(`/games/${template}/`).join(`/games/${id}/`)
         .split(`${template}_room`).join(`${id}_room`)
         .replace(new RegExp(`"gameId":\\s*"${template}"`, 'g'), `"gameId": "${id}"`);
    fs.writeFileSync(p, t);
  }
}
rewrite(dest);

console.log(`Created games/${id} from the ${template} template.`);
console.log(`Next:`);
if (fs.existsSync(path.join(dest, 'gameplay.js'))) {
  console.log(`  1. Edit games/${id}/game-config.json  (title, colors, modes/teams, formats, flow, hud, field)`);
  console.log(`  2. Edit games/${id}/gameplay.js       (your core rules + game-screen draw)`);
  console.log(`  3. npm start  →  TV: http://localhost:3000/games/${id}/screen.html`);
} else {
  console.log(`  1. Edit games/${id}/game-config.json  (title, colors, logo)`);
  console.log(`  2. Edit the 3 HTML files (lobby / controller / screen) — search "EDIT"`);
  console.log(`  3. npm start  →  TV: http://localhost:3000/games/${id}/screen.html`);
}
