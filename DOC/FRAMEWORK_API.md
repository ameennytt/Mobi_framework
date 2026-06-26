# Framework API Reference — what to call, and where

One-page map of every framework global. Each is a `window.*` object created by a
file in `framework/`. Load the file with a `<script>` tag, then call the methods.
All examples are real (verified against source). For the big picture read
[DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md); this is the lookup sheet.

---

## File → job map

| File | Global | Job |
|---|---|---|
| `framework/core/game.js` | `FrameworkGame` | One-call boot; wires everything |
| `framework/core/server.js` | _(Node)_ | HTTP static server + pairing routes |
| `framework/core/websocket.js` | _(Node)_ | WS relay + room lifecycle |
| `framework/core/room-manager.js` | _(Node)_ | Room create/lookup/cull |
| `framework/services/event-hub.js` | `FrameworkEvents` | Client WebSocket: send/on, auto-reconnect |
| `framework/services/router.js` | `FrameworkRouter` | Screen navigation + back stack |
| `framework/services/theme-loader.js` | `FrameworkTheme` | Apply colors from config → CSS vars |
| `framework/services/asset-loader.js` | `FrameworkAssets` | Resolve text/asset slots from config |
| `framework/services/storage.js` | `FrameworkStorage` | Persist state (session+local mirror) |
| `framework/renderer/renderer.js` | `FrameworkRenderer` | Canvas loop, fps cap, resize |
| `framework/renderer/layer-manager.js` | `FrameworkLayers` | 5 draw layers, bg cache |
| `framework/renderer/tv-perf-manager.js` | `TvPerfManager` | Adaptive resolution, 30fps lock |
| `framework/renderer/arena-scene.js` | `FrameworkArena` | Stadium gallery + particles/fireworks/trophy |
| `framework/renderer/fields.js` | `FrameworkFields` | Sport field overlays (goal/court/lanes/targetBoard) |
| `framework/renderer/projectile.js` | `Projectile` (alias `ShotVisuals`) | Sport-neutral geometry: perspective, boundary, RNG, arc |
| `framework/ui/templates.js` | `FrameworkTemplates` | TV scorebar/result/loading/banner, mobile shells |
| `framework/ui/components.js` | `FrameworkUI` | Score card, dialog, toast, pairing overlay |
| `framework/flow/lobby-flow.js` | `FrameworkFlow` | The whole config-driven lobby flow |
| `framework/inputs/motion-input.js` | `FrameworkMotion` | Tilt/accel/gyro (opt-in) |

**You almost always only need `FrameworkGame`.** It uses the rest for you.

**Namespaced access:** every global above is also on `window.Framework` —
`Framework.Game`, `Framework.Arena`, `Framework.UI`, `Framework.Projectile`, etc. The flat
`Framework*` globals remain as aliases, so either style works.

---

## FrameworkGame — `framework/core/game.js`

The bootstrap. `await FrameworkGame.init(cfg)` returns a small control API.

```js
const game = await FrameworkGame.init({
  role: 'screen' | 'bat',     // required
  gameId: 'chase',            // optional (auto from URL /games/<id>/)
  canvas: 'game-canvas',      // screen: canvas element id to render into
  draw: (ctx, W, H) => {},    // screen: your object-layer draw fn
  motion: false,              // bat: start tilt/swing sensors
  autoConnect: true,          // bat: connect now (false = pair later in lobby)
  autoOverlay: true,          // show pairing overlay / reconnect toast
  room: '',                   // bat: room code (else from ?room=)
  ephemeral: false,           // bat: lobby validate-only socket
  qrUrl: '',                  // screen: QR image for pairing overlay
  handlers: { action: (d)=>{}, game_state:(d)=>{} },  // your message handlers
  onConnect, onDisconnect, onPaired, onUnpaired, onCode, onError,
});
```

Returned API:
| Call | Does |
|---|---|
| `game.send(type, payload)` | Send to peer (fields arrive top-level) |
| `game.on(type, fn)` / `game.off(type, fn)` | Subscribe / unsubscribe |
| `game.connect(code, onPaired, ephemeral)` | Pair to a room (lobby) |
| `game.getCode()` / `game.isPaired()` | Current room code / paired bool |
| `game.text(slot)` / `game.asset(slot)` | Read config text/asset slot |
| `game.showResult(opts)` / `game.hideResult()` | TV result screen |
| `game.stage(name, data)` / `game.getStage()` | Lifecycle stage (see below) |

### Lifecycle stages (optional)
Standard phase names so games don't invent their own: `boot · loading · menu ·
calibration · match · paused · result · resume · destroy`. `game.stage('match')` sets the
stage, calls `window.Gameplay.<name>(data)` if defined, and fires a `framework:stage`
event. The framework auto-fires `boot` (on init), `paused`/`resume` (RN app
background/foreground), and `destroy` (page unload); you call the rest. Existing
`start/draw/action` are unaffected.

### Loading code (simple or modular)
`await FrameworkGame.loadGameplay()` (call in screen.html before `init`) loads the game's
code from `game-config.json` `code:[...]` (in order, entry last) — or a single `gameplay.js`
if no `code` field. Lets a game split into `gameplay/` + `extensions/`.

---

## FrameworkEvents — `framework/services/event-hub.js`

Raw WebSocket layer (FrameworkGame wraps it; use directly for custom flows).

```js
FrameworkEvents.connect(roomCode, 'screen'|'bat', ephemeral=false);
FrameworkEvents.on('action', (d) => { /* d.choice */ });
FrameworkEvents.off('action', fn);
FrameworkEvents.send('game_state', { runs: 12 });   // → {type,_sender,_ts,runs}
```
Lifecycle events you can listen for: `sys:connected`, `sys:disconnected`,
`sys:re-pair-required`.

---

## FrameworkRouter — `framework/services/router.js`

```js
FrameworkRouter.registerRoute('s-menu', 's-menu', { onEnter(){}, onLeave(){} });
FrameworkRouter.show('s-menu');     // push + activate (hides others)
FrameworkRouter.back();             // pop; at root asks RN shell to exit
FrameworkRouter.resetTo('s-welcome');
window.handleBackPress();           // bound for the native hardware back button
```

---

## FrameworkTheme / FrameworkAssets — `framework/services/*`

```js
await FrameworkTheme.load('chase');     // sets --game-* CSS vars from config.theme
await FrameworkAssets.loadConfig('chase');
FrameworkAssets.resolve('APP_LOGO');    // → url / gradient / fallback
FrameworkAssets.text('PRIMARY_SCORE');  // → "Runs" (config.text or fallback)
```
(FrameworkGame.init calls both for you.)

---

## FrameworkStorage — `framework/services/storage.js`

```js
FrameworkStorage.monitor(['chase_lobby_partial']); // also mirror to localStorage
FrameworkStorage.save('key', obj);   // obj auto-JSON
FrameworkStorage.load('key');        // parsed back
FrameworkStorage.remove('key');
```
Auto-mirrors monitored keys on background/pagehide (survives Android culls).

---

## FrameworkRenderer / FrameworkLayers / TvPerfManager — `framework/renderer/*`

```js
FrameworkRenderer.init('game-canvas', drawFn);  // drawFn → 'object' layer
FrameworkRenderer.start();  // stop(), resize(); .W/.H = canvas size
FrameworkLayers.register('background'|'ground'|'object'|'particle'|'ui', (ctx,W,H)=>{});
TvPerfManager.isLow(); TvPerfManager.scaleParticles(40);  // auto-managed
```
Layers draw in order: background (cached) → ground → object → particle → ui.

---

## FrameworkArena — `framework/renderer/arena-scene.js`

The reusable stadium (no players). Call `install()` before `FrameworkGame.init`.

```js
FrameworkArena.install({ field: 'goal', ads: [{txt:'PLAY', ux:-0.7, uy:0.78, color:'var-accent'}] });
FrameworkArena.burst(x, y, '#ffd700', 40);  // particle spray on a score
FrameworkArena.cheer(160);                   // crowd celebration frames
FrameworkArena.celebrate(true);              // fireworks + trophy on win
FrameworkArena.reset();                      // clear effects (new game)
FrameworkArena.boundary(W,H);                // {ey,erx,ery} rope ellipse
```

## FrameworkFields — `framework/renderer/fields.js`

Optional sport field drawn on the stadium. Pick one via `FrameworkArena.install({field})`
(or `config.field`). Each is `(ctx,W,H)` placed with `Projectile.perspective`.

```js
FrameworkFields.goal(ctx,W,H);        // football/hockey net + posts
FrameworkFields.court(ctx,W,H);       // tennis/volley net + lines
FrameworkFields.lanes(ctx,W,H);       // bowling/running lanes
FrameworkFields.targetBoard(ctx,W,H); // archery/darts board
```

## Projectile — `framework/renderer/projectile.js`

Sport-neutral geometry only (exposed as `Projectile`; `ShotVisuals` is a back-compat
alias). Cricket-specific shot math (runs/wickets/overs, win-prob, milestones) was moved
OUT of the core into the game — see `games/chase/chase-shot.js` (`window.ChaseShot`).

```js
Projectile.perspective(W,H);          // {cx,horizY,farY,nearY,farW,nearW}
Projectile.boundaryHit(W,H,px,py,dx,dy); // ray↔rope-ellipse hit (alias: ropeHit)
Projectile.hashSeed(str); Projectile.mulberry32(seed); // seeded RNG
Projectile.fmAngleFromCanvas(bx,by,tx,ty);
Projectile.arc(power0to1, W, H);      // {dur,arcH,big,r}
```

---

## FrameworkTemplates — `framework/ui/templates.js`

```js
// HUD archetypes — pick by kind: 'chase' | 'versus' | 'attempt'
FrameworkTemplates.renderScorebar('versus', { titleA:'You', titleB:'CPU' });
FrameworkTemplates.updateScorebar('versus', { you, cpu, round, rounds });   // or {clock}
FrameworkTemplates.renderScorebar('attempt', { title:'Score' });
FrameworkTemplates.updateScorebar('attempt', { score, attempt, attempts, best });
// chase HUD (also the direct calls):
FrameworkTemplates.renderTVScorebar({ title:'Chase', chasingLabel:'Target 30' });
FrameworkTemplates.updateTVScorebar({ runs, balls, overs, target });
FrameworkTemplates.hideTVScorebar();
FrameworkTemplates.showTVBanner('SIX!', '#ffd700', 'optional sub');
FrameworkTemplates.renderTVResult({ bannerText, winner, stats:[{label,value}],
  primaryText, onPrimary, secondaryText, onSecondary });
FrameworkTemplates.hideTVResult();
FrameworkTemplates.renderTVLoading({ logoUrl, message });
FrameworkTemplates.updateTVLoading(pct); FrameworkTemplates.hideTVLoading();
FrameworkTemplates.renderTVDisconnected({ message }); // hideTVDisconnected()
// mobile shells: renderMobileLobby / renderMobileControllerHUD / renderMobileCalibration
```

## FrameworkUI — `framework/ui/components.js`

```js
FrameworkUI.renderScoreCard('hud', 'Runs', 12, 'accent');
FrameworkUI.renderStatGrid('grid', [{label:'Aces', value:6}]);
FrameworkUI.showConfirmDialog({ title, body, confirmText, cancelText, onConfirm, onCancel });
FrameworkUI.renderPairingOverlay(code, 'waiting'|'connecting'|'failed', qrUrl);
FrameworkUI.hidePairingOverlay();
FrameworkUI.showToast('Reconnecting…', 2500, /*isError*/ true);
```

---

## FrameworkFlow — `framework/flow/lobby-flow.js`

The whole lobby flow, built from `game-config.json`.

```js
FrameworkFlow.mount({
  game,                       // a FrameworkGame api (role:'bat', autoConnect:false)
  config,                     // fetched game-config.json
  onLaunch: (sel) => {        // sel = {mode,team,opp,format,overs,difficulty,target,room}
    location.href = `controller.html?room=${sel.room}&target=${sel.target}&overs=${sel.overs}`;
  },
});
FrameworkFlow.selection();    // current picks
FrameworkFlow.go(1);          // jump to a step index
```

The flow is declared in `config.flow` (a `[]` of steps). Step types:
```jsonc
{ "type": "pair" }                                              // welcome + code (first)
{ "type": "choice", "key": "team", "title": "...", "source": "teams",
  "branch": true,                                               // store chosen .branch in S.branch
  "when": { "key": "branch", "equals": "cup" } }                // show only if a prior pick matches
{ "type": "ceremony", "kind": "toss" }                          // 'toss' sets target; 'kickoff' just advances
{ "type": "target" }   // or  { "type": "briefing" }            // summary + launch
```
`choice.source` = a config key (`teams`/`formats`/`modes`/`difficulties`), a path
(`chaseData.cup`), or `$league.teams` (clubs of the league picked earlier). No `flow`
in config → the default chase flow is used.

## FrameworkMotion — `framework/inputs/motion-input.js`

```js
await FrameworkMotion.requestPermission();  // iOS gesture gate
FrameworkMotion.start(); FrameworkMotion.stop(); FrameworkMotion.calibrate();
FrameworkMotion.onMotion((m) => {});  FrameworkMotion.onOrientation((o) => {});
```
(Off by default. Enable via `FrameworkGame.init({ motion: true })`.)

---

## System messages (framework-managed, lowercase)

You don't send these; you may listen:
`room_created` · `role` · `bat_connected` · `bat_disconnected` ·
`screen_disconnected` · `screen_rejoined` · `error`

Your own game messages use any lowercase name (`action`, `game_state`,
`game_over`, `start`, …). Payload fields arrive top-level on the peer.

---

## game-config.json keys

| Key | Used by | What |
|---|---|---|
| `gameId`, `version` | all | identity |
| `supportsTv/Mobile/Motion` | manifest | capability flags |
| `theme` | FrameworkTheme | `--game-*` CSS vars |
| `assets` | FrameworkAssets | slot → url/gradient |
| `text` | FrameworkAssets | slot → label |
| `modes`, `teams`, `chaseData`, `formats`, `difficulties` | FrameworkFlow | lobby content |
| `flow` | FrameworkFlow | lobby steps[] (default = chase flow) |
| `hud` | gameplay | scorebar archetype: `chase`/`versus`/`attempt` |
| `field` | FrameworkArena | field overlay: `goal`/`court`/`lanes`/`targetBoard` |
| `enableEnrichment` | server | load `shared/relay-enrich.js` |

## CLI

```bash
npm start                              # dev server :3000
npm run new-game <id> [--from chase|versus|starter]   # scaffold a game
npm run publish <id>                   # wire native shell + worker + embedded payload
npm run bundle <id>                    # (optional) concat scripts → dist/*.bundle.js
npm test
```
