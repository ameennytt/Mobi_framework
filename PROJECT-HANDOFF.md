# TV + Mobile Game Framework — Project Handoff / Claude Context

Single-file context for a fresh Claude/AI session. Read this first.

---

## 1. What this is

A generic **TV + phone** game framework. Phone = controller (mobile browser / WebView in a
native app). TV = big screen (browser). Phone hosts a small server; TV connects over LAN Wi-Fi;
they pair by a 4-char room code and relay messages.

The flagship game is **`games/cricswing`** — a pixel-perfect rebuild of the original **CricSwing**
app onto this framework. Original reference lives at
`C:\Users\alame\Downloads\cric-final\cric-final` (READ-ONLY reference; `docs/` there is the
source of truth — always read `docs/` before auditing anything).

Goal (locked): **framework-first evolution** — upgrade the FRAMEWORK so its DEFAULT output is
CricSwing-quality and sport-neutral; games only carry sport-specific data/config. `cricswing` is
buttons-only (no motion/gyro this pass — motion is a future opt-in).

---

## 2. Architecture (how it fits together)

```
framework/            ← shared engine (UI, flow, renderer, server) — SOURCE, edit here
  core/               server.js (dev Node http), websocket.js + room-manager.js (ws relay), game.js
  flow/               lobby-flow.js (data-driven lobby), flow.css (lobby styles)
  ui/                 templates.js (TV), templates.mobile.js, controller.js (in-match), framework.css (tokens), charts.js (broadcast widgets)
  renderer/           arena-scene.js, projectile.js, renderer.js (TV canvas)
  native/app-template/  RN shell + NEW tcp-socket server (src/server/)
games/<id>/           one folder per game — SOURCE, edit here
  game-config.json    ALL content: text, colors(theme), teams, formats, flow steps, controller
  screen.html lobby.html controller.html home.html
  gameplay/           rules.js scoring.js visuals.js index.js controller.js  (+ chase-shot.js for cricswing)
  app/                GENERATED native app (throwaway) — DO NOT edit; rebuilt by publish
scripts/              publish.js, sync-assets.js, new-game.js, bundle.js, sync.js
```

**Golden rule:** edit the **source** (`framework/*`, `games/<id>/*`). NEVER edit the copies inside
`games/<id>/app/**/assets/web/`. `publish` / `sync-assets` copy source → app (one direction).

**Config vs code split:** config = content only (text, colors, data, which layout, which screens).
Code = all rendering/layout/behavior. No CSS/logic in JSON. Colors via a `theme` block →
`--game-*` tokens.

**Transport:** `ws://` WebSocket protocol everywhere. Dev = Node `ws` server
(`framework/core/server.js`, `npm start`, port 3000). On device = pure-JS server over
`react-native-tcp-socket` (see §5). WS paths: `/ws/screen` + `/ws/bat`, query `room`, `ephemeral`,
`game`. Routes: `/api/local-ip`, `/games/<id>/*`, `/framework/*`.

---

## 3. Migration phases — status

- **Phase 1 (scaffold):** DONE — cricswing scaffolded, fonts/assets/SVG icons migrated, branded,
  pairing + relay verified in browser.
- **Phase 2 (lobby):** DONE — all lobby screens match original per screenshot review:
  pair, consent, **intro carousel** (3 animated art archetypes `art:'phone'|'timing'|'lock'` +
  prev/next/skip/dots), mode hub (Step-1 chip, sub, **Featured Chase locked** card), country tiles
  (`tile:true`,`tileSub`), **league rows** (`layout:'rows'` → flag+country+leagueName+"N cities"),
  city tiles, format (Step-2 + `context:'team'` → picked country + CHANGE chip), difficulty
  (Step-3 + VS preview + `_easy/_medium/_hard` selected colors), toss (Step-4), stance (auto-skips
  when `supportsMotion:false`), target+roster. Real chase data (12 cup countries + 12 leagues with
  real cities/flag colors) added to config. Opponent drawn from same pool (`pickOpp(source)`).
  New lobby layout keys in `lobby-flow.js`: `fw-mode` / `fw-rows` / `fw-tile`.
- **Phase 3 (gameplay, buttons):** DONE — controller UI polished (premium HUD, accent option
  pills, big PLAY SHOT). Match-end result: 6-stat grid (RUNS/OVERS/WKTS/TARGET/SR/BNDRS), "Chased
  N · Lost by M runs" sub, quote, series dots, Next Match/New Tournament. Boundaries + strike-rate
  tracked (`scoring.js`), sent in `game_over`. Pre-match quick-tips carousel.
- **Phase 4 (TV screen):** DONE — core broadcast loop existed (arena, scorebar, banners,
  over-summary, result, away/disconnect, timing ring). Added: milestone falling-emoji fireworks,
  wicket takeover (`showTVWicket`), and wired the **opt-in broadcast HUD** (`tv.broadcast:'full'`):
  SHOT MAP wagon-wheel + RUNS/OVER manhattan (from `charts.js`) + last-ball card + conn badge, fed
  per-ball from `gameplay/index.js`. One knob toggles the whole bundle.
- **Phase 5 (transport + APK):** Part A DONE (see §5). Part B (build/upgrade) IN PROGRESS on user's
  machine.

---

## 4. Key decisions & gotchas

- **Buttons only** for cricswing (no motion/ML). Motion stack in the original
  (`useSensorBridge.ts`, `analysis/` ML, `telemetry-server/`, `cloudflare/`) is PARKED.
- **Deferred (not built):** Featured Chase levels 1-100; WC 108-nation region-tab expansion (our 12
  test nations = CricSwing's default view); "your country" geo tile; settings toggle UI.
- **Audit discipline:** when auditing the original, READ `docs/` + the full tree FIRST. Twice we
  got it wrong by grepping one surface file: missed `chase-data.js` (real league data) and the
  tcp-socket migration (`docs/16KB-MIGRATION.md`). Never conclude architecture from one grep.
- **Transport truth:** original MIGRATED off nodejs-mobile → pure-JS server over
  `react-native-tcp-socket` (Play rejected `libnode.so`: 4 KB-aligned; needs 16 KB page size;
  nodejs-mobile dead since 2024-10). Protocol stays `ws://`; only the server impl changed.
- **RN version:** `assembleDebug` / local testing works on **RN 0.73** (tcp-socket + fs support
  0.73). **RN 0.77 is ONLY needed for the Play Store 16 KB rule** (release AAB). Template is pinned
  to 0.73 for now; do 0.77 upgrade only at Play-submission time.
- **`npx @react-native-community/cli upgrade` is REMOVED** in the new CLI (error: `unknown command
  'upgrade'`). For the 0.77 upgrade use the **RN Upgrade Helper website** (manual android/ diffs)
  OR init a fresh 0.77 project and copy its `android/`. (BUILD.md still says the dead command —
  fix pending.)
- **npm script args:** `npm run new-game -- mygame --from X` (the `--` matters; npm eats flags).

---

## 5. Phase 5 detail — the tcp-socket server (Part A, DONE)

New pure-JS on-device server in **`framework/native/app-template/src/server/`** (isolated; the dev
server `framework/core/server.js` is untouched → zero browser-dev regression):

- `sha1.js` + `wsproto.js` — RFC 6455 handshake + frame codec (ported verbatim; pure JS, `Buffer`).
- `staticHttp.js` — OUR routes (`/framework/*`, `/games/<id>/*`, `/api/local-ip`) + `..` guard.
- `relay.js` — room/reclaim→`screen_rejoined`/superseded/ephemeral/close-guard/60s-cull/40-msg-s/
  64KB, behavior-ported 1:1 from `websocket.js` + `room-manager.js`; transport-neutral `conn`.
- `index.js` — `startServer({onEvent,getLanIp,port,tcp,readAsset})` over `react-native-tcp-socket`
  + `react-native-fs`; 10s heartbeat; `tcp`/`readAsset` injectable for tests.
- `__test__/run-node.js` — Node harness, **26/26 pass**. Run: `npm run server-test` (in app-template).

Shell wired: `App.tsx` calls `startServer()` (no rn-bridge); `package.json` dropped
nodejs-mobile, added `react-native-tcp-socket` + `react-native-fs` + `buffer` (pinned RN 0.73.6
for now); `android/app/build.gradle` removed `aaptOptions { noCompress "node" }`; `android/build.gradle`
`ndkVersion 27.1.12297006` (only matters for the 0.77/Play build). `scripts/sync-assets.js` mirrors
`framework/` + `games/<id>/` → `app/android/app/src/main/assets/web/` and refreshes `app/src/server`;
`publish.js` repointed off `nodejs-assets/nodejs-project`.

Plan file: `.claude/plans/swirling-munching-lobster.md`. Runbook: `framework/native/app-template/BUILD.md`.

---

## 6. Commands

```
npm start                              # dev server (browser test) → http://localhost:3000
npm run new-game -- <id> --from cricswing   # clone cricswing as base for a new game
npm run publish <id>                   # generate games/<id>/app (native app, tcp-socket server)
# then in games/<id>/app:
npm install                            # once
npm run sync-assets                    # re-copy source → app after any framework/game edit
cd android && ./gradlew assembleDebug  # build debug APK (RN 0.73 — no 0.77 needed)
adb install app/build/outputs/apk/debug/app-debug.apk
npm run server-test                    # (in app-template) verify tcp-socket server: 26/26
```

Browser test URLs: TV `http://localhost:3000/games/cricswing/screen.html`,
phone `.../lobby.html`. One-time screens (intro/consent) gate on localStorage
`cricswing_intro_seen` / `cricswing_consent` — clear to re-test.

---

## 7. Pending

**On user's machine (now):** local `npm install` + `assembleDebug`/`run-android` on RN 0.73;
install on phone; device-test pairing + play + the reconnect/resume flows.

**Later, Play Store only:** RN 0.77 upgrade (via Upgrade Helper site — NOT the removed `upgrade`
command) → NDK r27 → `bundleRelease` → verify 16 KB alignment (no `libnode.so`) → upload AAB.

**Optional:** re-publish `soccer` onto tcp-socket (still old nodejs-mobile); client reconnect
hardening if device testing surfaces gaps.

**Fix pending:** `BUILD.md` still references the removed `npx ... upgrade 0.77.3` command.

---

## 8. Published games state

- `games/cricswing/app` → NEW tcp-socket path (fresh). `games/soccer/app` → OLD nodejs-mobile
  (Play-rejected; re-publish to update). `chase`/`starter`/`versus` = not published.
- `new-game --from` presets: `starter` (blank buttons), `chase` (cricket broadcast), `versus`
  (football), `cricswing` (full pixel-perfect CricSwing reference).
