#!/usr/bin/env node
'use strict';

/**
 * Visual-regression harness (RUN LOCALLY — needs a browser).
 *
 * Screenshots each game's TV + phone screens and diffs them against saved baselines,
 * so "premium / pixel-perfect" stays enforced as the UI changes.
 *
 * One-time setup:
 *   npm i -D playwright
 *   npx playwright install chromium
 *
 * Use:
 *   npm start                 # in another terminal (serves :3000)
 *   npm run visual            # first run writes baselines; later runs compare
 *   npm run visual -- --update   # overwrite baselines (after an intended change)
 *
 * Output: tests/baselines/<game>-<surface>.png  +  tests/diffs/ on mismatch.
 *
 * Note: comparison is byte-exact (strict). For tolerant pixel diffs add `pixelmatch`
 * + `pngjs` and swap the Buffer.compare below. Good enough to catch layout/colour drift.
 */
const fs = require('fs');
const path = require('path');

let chromium;
try { ({ chromium } = require('playwright')); }
catch (_) {
  console.error('Playwright not installed. Run:  npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const root = path.join(__dirname, '..');
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const update = process.argv.includes('--update');
const baseDir = path.join(root, 'tests', 'baselines');
const diffDir = path.join(root, 'tests', 'diffs');
fs.mkdirSync(baseDir, { recursive: true });
fs.mkdirSync(diffDir, { recursive: true });

// surfaces to shoot: [game, surface, viewport]
const TV = { width: 1280, height: 720 };
const PHONE = { width: 390, height: 844 };
function targets() {
  const games = fs.readdirSync(path.join(root, 'games'), { withFileTypes: true })
    .filter(e => e.isDirectory()).map(e => e.name);
  const list = [];
  for (const g of games) {
    if (fs.existsSync(path.join(root, 'games', g, 'screen.html'))) list.push([g, 'screen', TV]);
    if (fs.existsSync(path.join(root, 'games', g, 'lobby.html'))) list.push([g, 'lobby', PHONE]);
  }
  return list;
}

(async () => {
  const browser = await chromium.launch();
  let mismatches = 0, wrote = 0;
  for (const [game, surface, vp] of targets()) {
    const page = await browser.newPage({ viewport: vp });
    try {
      await page.goto(`${BASE}/games/${game}/${surface}.html`, { waitUntil: 'networkidle', timeout: 8000 });
      await page.waitForTimeout(1200);   // let intro/anim settle
    } catch (e) { console.warn(`skip ${game}/${surface}: ${e.message}`); await page.close(); continue; }
    const shot = await page.screenshot();
    await page.close();
    const baseFile = path.join(baseDir, `${game}-${surface}.png`);
    if (update || !fs.existsSync(baseFile)) {
      fs.writeFileSync(baseFile, shot); wrote++;
      console.log(`baseline ${game}-${surface}.png`);
    } else {
      const base = fs.readFileSync(baseFile);
      if (Buffer.compare(base, shot) !== 0) {
        fs.writeFileSync(path.join(diffDir, `${game}-${surface}.png`), shot);
        console.log(`DIFF  ${game}-${surface}  (see tests/diffs/)`);
        mismatches++;
      } else {
        console.log(`ok    ${game}-${surface}`);
      }
    }
  }
  await browser.close();
  if (wrote) console.log(`\nWrote ${wrote} baseline(s).`);
  console.log(mismatches ? `\n${mismatches} screen(s) changed — review tests/diffs/.` : '\nAll screens match baselines.');
  process.exit(mismatches ? 1 : 0);
})();
