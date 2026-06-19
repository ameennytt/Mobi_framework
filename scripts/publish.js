#!/usr/bin/env node
'use strict';

/**
 * Wire a game for shipping: one command points the native shell + pairing worker
 * at <id> and refreshes the embedded server payload. It does NOT build the APK or
 * deploy the worker (those need your Android SDK / Cloudflare account) — it leaves
 * only `run-android` and `wrangler deploy` to run.
 *
 * Usage: npm run publish <id>
 */
const fs = require('fs');
const path = require('path');

const id = (process.argv[2] || '').trim();
if (!/^[a-z][a-z0-9-]{1,30}$/.test(id)) {
  console.error('Usage: npm run publish <id>');
  process.exit(1);
}

const root = path.join(__dirname, '..');
const gameDir = path.join(root, 'games', id);
const cfgPath = path.join(gameDir, 'game-config.json');
if (!fs.existsSync(cfgPath)) { console.error(`games/${id}/game-config.json not found.`); process.exit(1); }

const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const theme = cfg.theme || {};
const esc = (s) => String(s == null ? '' : s).replace(/'/g, "\\'");
const title = esc((cfg.text && cfg.text.APP_TITLE) || id);
const accent = esc(theme['--game-accent'] || '#00d2ff');
const bg = esc(theme['--game-primary'] || '#060a14');
const motion = cfg.supportsMotion === true;

function patch(file, edits) {
  if (!fs.existsSync(file)) { console.warn(`  skip (missing): ${path.relative(root, file)}`); return; }
  let t = fs.readFileSync(file, 'utf8');
  for (const [re, rep] of edits) t = t.replace(re, rep);
  fs.writeFileSync(file, t);
  console.log(`  patched ${path.relative(root, file)}`);
}

// 1. Native shell
patch(path.join(root, 'mobile', 'App.tsx'), [
  [/const GAME_ID = '[^']*';/, `const GAME_ID = '${id}';`],
  [/const BRAND = \{[^}]*\};/, `const BRAND = { name: '${title}', accent: '${accent}', bg: '${bg}' };`],
  [/const USE_MOTION = (?:true|false);/, `const USE_MOTION = ${motion};`],
]);

// 2. Rendezvous worker
patch(path.join(root, 'framework', 'rendezvous', 'wrangler.toml'), [
  [/name = "[^"]*-rendezvous"/, `name = "${id}-rendezvous"`],
  [/^name = "mygame[^"]*"/m, `name = "${id}-rendezvous"`],
]);
patch(path.join(root, 'framework', 'rendezvous', 'worker.js'), [
  [/name: '[^']*', tagline:/, `name: '${title}', tagline:`],
]);

// 3. Re-sync embedded payload (framework minus native/rendezvous + this game)
const dest = path.join(root, 'mobile', 'nodejs-assets', 'nodejs-project');
function syncFramework() {
  const fwSrc = path.join(root, 'framework');
  const fwDest = path.join(dest, 'framework');
  fs.cpSync(fwSrc, fwDest, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(fwSrc, src);
      return !rel.startsWith('native') && !rel.startsWith('rendezvous');
    },
  });
}
function syncGame() {
  fs.cpSync(gameDir, path.join(dest, 'games', id), { recursive: true });
}
if (fs.existsSync(dest)) {
  syncFramework();
  syncGame();
  console.log(`  synced framework/ + games/${id}/ → mobile/nodejs-assets/nodejs-project/`);
} else {
  console.warn('  skip embedded sync — mobile/nodejs-assets/nodejs-project not found');
}

console.log(`\nWired "${id}" for publish. Remaining manual steps:`);
console.log(`  APK:    cd mobile && npm install && npx react-native run-android`);
console.log(`  Pair site (optional, prod): cd framework/rendezvous && wrangler deploy`);
console.log(`  Then set RENDEZVOUS_URL in games/${id}/game-config.json to your worker domain.`);
