#!/usr/bin/env node
'use strict';

/**
 * Mirror a game's web surface + the embedded server into its native app, for the
 * react-native-tcp-socket build (no more nodejs-mobile / nodejs-project).
 *
 *   node scripts/sync-assets.js <id>      (or run from games/<id>/app — id inferred)
 *
 * Copies:
 *   framework/ (minus native, rendezvous)  → games/<id>/app/android/app/src/main/assets/web/framework/
 *   games/<id>/ (minus app/)               → games/<id>/app/android/app/src/main/assets/web/games/<id>/
 *   framework/native/app-template/src/server/* → games/<id>/app/src/server/   (refresh server code)
 *   games/<id>/shared/{relay-enrich,shot-visuals}.js → games/<id>/app/src/server/shared/  (opt-in enrichment)
 *
 * The on-device server (src/server/index.js) reads assets from `web/` via
 * react-native-fs; the WebView loads http://localhost:3000/games/<id>/home.html.
 * Run this after any framework/game edit; no native rebuild needed to reload the WebView.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const SKIP = new Set(['node_modules', 'build', '.gradle', '.cxx', '.idea', 'app', 'nodejs-assets']);

function copyDir(src, dest, skip, filter) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip.has(e.name)) continue;
    const s = path.join(src, e.name), d = path.join(dest, e.name);
    if (filter && !filter(s)) continue;
    if (e.isDirectory()) copyDir(s, d, skip, filter);
    else fs.copyFileSync(s, d);
  }
}

function syncAssets(id) {
  const gameDir = path.join(root, 'games', id);
  const appDir = path.join(gameDir, 'app');
  if (!fs.existsSync(appDir)) throw new Error(`games/${id}/app missing — run 'npm run publish ${id}' first.`);

  const webRoot = path.join(appDir, 'android', 'app', 'src', 'main', 'assets', 'web');

  // framework → web/framework (skip native + rendezvous — not served on device)
  fs.rmSync(path.join(webRoot, 'framework'), { recursive: true, force: true });
  copyDir(path.join(root, 'framework'), path.join(webRoot, 'framework'), SKIP, (s) => {
    const rel = path.relative(path.join(root, 'framework'), s);
    return !rel.startsWith('native') && !rel.startsWith('rendezvous');
  });

  // game → web/games/<id> (skip its own app/)
  fs.rmSync(path.join(webRoot, 'games', id), { recursive: true, force: true });
  copyDir(gameDir, path.join(webRoot, 'games', id), SKIP);

  // refresh the pure-JS server from the template (minus the Node-only test harness)
  const tplServer = path.join(root, 'framework', 'native', 'app-template', 'src', 'server');
  const appServer = path.join(appDir, 'src', 'server');
  copyDir(tplServer, appServer, new Set(['__test__', 'node_modules']));

  // opt-in per-game enrichment: bundle relay-enrich + shot-visuals for `require('./shared/...')`
  const shareDst = path.join(appServer, 'shared');
  fs.mkdirSync(shareDst, { recursive: true });
  for (const f of ['relay-enrich.js', 'shot-visuals.js']) {
    const s = path.join(gameDir, 'shared', f);
    if (fs.existsSync(s)) fs.copyFileSync(s, path.join(shareDst, f));
  }

  console.log(`  synced web assets + server for "${id}" → ${path.relative(root, webRoot)}`);
}

if (require.main === module) {
  let id = (process.argv[2] || '').trim();
  if (!id) {
    const m = process.cwd().replace(/\\/g, '/').match(/games\/([^/]+)\/app(\/|$)/);
    if (m) id = m[1];
  }
  if (!/^[a-z][a-z0-9-]{1,30}$/.test(id)) { console.error('Usage: node scripts/sync-assets.js <id>'); process.exit(1); }
  try { syncAssets(id); } catch (e) { console.error(e.message); process.exit(1); }
}

module.exports = { syncAssets };
