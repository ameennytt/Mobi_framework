#!/usr/bin/env node
'use strict';

/**
 * Fast re-embed for an ALREADY-published game — copies the current framework + game
 * into games/<id>/app/nodejs-assets/nodejs-project/ WITHOUT wiping the app (so you
 * don't rebuild the native shell). Use after editing framework/ or the game during
 * on-device iteration.
 *
 *   npm run sync <id>
 *
 * (First time, or to regenerate the whole app, use `npm run publish <id>`.)
 */
const fs = require('fs');
const path = require('path');

const id = (process.argv[2] || '').trim();
if (!/^[a-z][a-z0-9-]{1,30}$/.test(id)) { console.error('Usage: npm run sync <id>'); process.exit(1); }

const root = path.join(__dirname, '..');
const gameDir = path.join(root, 'games', id);
const np = path.join(gameDir, 'app', 'nodejs-assets', 'nodejs-project');
if (!fs.existsSync(np)) {
  console.error(`games/${id}/app not found — run "npm run publish ${id}" first.`);
  process.exit(1);
}

const SKIP = new Set(['node_modules', 'build', '.gradle', '.cxx', '.idea', 'app']);
function copyDir(src, dest, skip) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip.has(e.name)) continue;
    const s = path.join(src, e.name), d = path.join(dest, e.name);
    if (e.isDirectory()) copyDir(s, d, skip);
    else fs.copyFileSync(s, d);
  }
}

// framework (minus native/rendezvous)
fs.rmSync(path.join(np, 'framework'), { recursive: true, force: true });
fs.cpSync(path.join(root, 'framework'), path.join(np, 'framework'), {
  recursive: true,
  filter: (src) => {
    const rel = path.relative(path.join(root, 'framework'), src);
    return !rel.startsWith('native') && !rel.startsWith('rendezvous') && !SKIP.has(path.basename(src));
  },
});
// this game (minus its own app/)
fs.rmSync(path.join(np, 'games', id), { recursive: true, force: true });
copyDir(gameDir, path.join(np, 'games', id), SKIP);

console.log(`Synced framework + games/${id} → games/${id}/app (no app rebuild). Reload the app.`);
