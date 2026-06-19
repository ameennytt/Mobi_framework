# Developer Guide: TV + Mobile Game Framework V1

Build multiplayer-style games where the **phone is the controller** and the
**Smart TV is the screen**. The framework handles pairing, connection, reconnect,
navigation, sensors, and TV performance — you write only the game.

---

## 1. Model

- **TV (`screen.html`)** — passive canvas. Draws the game, shows the score, runs
  the result screen. Never needs the remote.
- **Phone (`lobby.html` + `controller.html`)** — pairs with the TV, picks
  options, then sends inputs.
- **Server** — pairs the two by code and relays messages instantly.

One call wires the plumbing on every page: **`FrameworkGame.init({ ... })`**.

---

## 2. Start a new game

Two templates to copy from:

```bash
npm run new-game tennis                # minimal shell  → games/tennis
npm run new-game tennis --from chase   # cricket-style chase flow
npm run new-game tennis --from versus  # head-to-head (both-score) flow
npm start                              # serve everything on :3000
```

- **starter** — a bare 3-screen shell (welcome → menu → setup). Smallest base.
- **chase** — chase/target archetype: pick mode → team / chase-cup / chase-league →
  format → difficulty → toss → target → play. Stadium (no players) + chase HUD.
- **versus** — head-to-head archetype: pick team → length → kickoff → play, you vs CPU,
  versus HUD + goal field overlay. Proves the platform beyond cricket.

Both rich templates share ONE engine. The lobby is declared in `game-config.json`
`flow:[...]` (step list); the HUD is `hud:"chase"|"versus"|"attempt"`; the field is
`field:"goal"|"court"|"lanes"|"targetBoard"`. Change sport = change config + `gameplay.js`,
no flow code. See [FRAMEWORK_API.md](FRAMEWORK_API.md).

Open the TV at `http://localhost:3000/games/tennis/screen.html` (shows a code),
and the phone at `http://localhost:3000/games/tennis/lobby.html` (type the code).

### With the `chase` template you edit only TWO files

The whole flow, navigation, pairing, reconnect, stadium and scorebar live in
`framework/` — not in your game. You touch:

```
games/tennis/
├── game-config.json   # name, colors, MODES, TEAMS, formats, difficulties (no code)
└── gameplay.js        # your core rules + the game-screen draw(ctx,W,H)
```

`lobby.html` / `controller.html` / `screen.html` stay thin (a few lines that boot
the framework) and rarely change. That's the point: **you focus on gameplay + the
game screen — exactly like CricSwing's batting/swing code section — and everything
else defaults.** To add motion/swing later: `game-config.json` `supportsMotion:true`
and pass `motion:true` to `FrameworkGame.init` in the controller. The button input
keeps working as a fallback.

### With the `starter` template you edit four files

Search the files for `EDIT`:

```
games/tennis/
├── game-config.json   # name, colors, logo, score labels  (no code)
├── lobby.html         # menu + setup screens
├── controller.html    # phone buttons / inputs
└── screen.html        # TV canvas drawing + game rules
```

---

## 3. The bootstrap — `FrameworkGame.init()`

### TV (`screen.html`)
```js
const game = await FrameworkGame.init({
  role: 'screen',
  canvas: 'game-canvas',
  draw: (ctx, W, H) => { /* draw your game */ },
  onPaired: () => { /* phone connected */ },
  handlers: {
    action: (d) => { /* controller input arrived: d.choice ... */ },
  },
});
game.showResult({ bannerText: 'Game Over', winner: '12 pts',
  stats: [{label:'Score', value:12}], primaryText: 'PLAY AGAIN',
  onPrimary: () => { game.hideResult(); /* restart */ } });
```
The framework shows the pairing overlay (code + status) and reconnect handling
automatically. `game.text(slot)` / `game.asset(slot)` read `game-config.json`.

### Phone controller (`controller.html`)
```js
const game = await FrameworkGame.init({
  role: 'bat',
  // motion: true,   // enable tilt/swing sensors (off by default)
  handlers: {
    game_state: (d) => { /* update HUD */ },
    game_over:  (d) => { /* show dialog */ },
  },
});
game.send('action', { choice: 'left' });   // payload fields arrive top-level on the TV
```

### Phone lobby (`lobby.html`)
Use `FrameworkRouter` for setup screens, and pair after the user types a code:
```js
const game = await FrameworkGame.init({ role: 'bat', autoConnect: false });
game.connect(typedCode, () => FrameworkRouter.show('s-menu'), true /* ephemeral */);
```

---

## 4. Messages

`game.send(type, payload)` → the peer's `handlers[type](payload)` (payload fields
are top-level, e.g. `d.choice`). System messages are framework-managed:
`room_created`, `role`, `bat_connected`, `bat_disconnected`, `screen_disconnected`,
`error`. Pick your own lowercase names for game messages (`action`, `game_state`,
`game_over`, …).

---

## 5. Dev vs production pairing

Same game code; flip one setting.

| | `RENDEZVOUS_URL` | How TV pairs |
|---|---|---|
| **Dev** | `""` | Type the 6-char code shown on the TV |
| **Prod** | `"https://mygame.com"` | TV opens your domain → phone enters short code → TV redirects to the phone |

Ship each game as its own app + its own pairing site:
- Native shell: `framework/native/` (set `GAME_ID`, `BRAND`, `USE_MOTION`).
- Pairing site: `framework/rendezvous/` (a Cloudflare Worker on your domain).

See `framework/native/README.md` and `framework/rendezvous/README.md`.

---

## 6. The reusable flow + stadium (chase template)

The `chase` template wires three framework modules so you don't rebuild them:

- **`FrameworkFlow.mount({ game, config, onLaunch })`** (`framework/flow/`) — builds
  the entire lobby flow from `game-config.json` (`modes`, `teams`, `chaseData`,
  `formats`, `difficulties`) and calls `onLaunch(selection)` at the end. Navigation,
  the back stack and partial-state persistence are handled for you.
- **`FrameworkArena.install()`** (`framework/renderer/arena-scene.js`) — the broadcast
  stadium gallery (sky, stands, crowd, boundary, ad boards) plus `burst()`, `cheer()`
  and `celebrate()` (particles / fireworks / trophy). No players — you draw your own
  action on the `object` layer.
- **`ShotVisuals`** (`framework/renderer/shot-visuals.js`) — pure ball/projectile math
  (`computeShotLanding`, `computeArcParams`, `buildVisual`) so a ball lands exactly on
  the drawn boundary.
- **Scorebar / banner** — `FrameworkTemplates.renderTVScorebar()` / `updateTVScorebar()`
  / `showTVBanner()`.

It's modular on purpose (small, editable files — not CricSwing's monoliths) and costs
no FPS: all modules load up-front via `<script>` tags, the static stadium is cached on
the background layer, and `TvPerfManager` still drives resolution/idle-freeze.

## 7. Examples to learn from
- `games/chase` — chase/target archetype (cricket-style).
- `games/versus` — head-to-head archetype (football, you vs CPU).
- `games/starter` — the empty shell.
- `games/cricswing` — full motion + ML reference.

## 7b. Shipping a game
```bash
npm run publish <id>   # points the native shell + pairing worker at <id>, re-syncs the embedded payload
```
Then build the APK (`cd mobile && npx react-native run-android`) and, for cloud
pairing, deploy the worker (`cd framework/rendezvous && wrangler deploy`) and set
`RENDEZVOUS_URL` in the game config. See `framework/native/README.md` and
`framework/rendezvous/README.md`.

---

## 8. Rules of thumb
- Don't edit `framework/` — keep game code in `games/<id>/`.
- Keep score math / rules on the TV (`screen.html`); the phone just sends inputs.
- Send messages on state **changes**, not every animation frame (see
  `BEST_PRACTICES.md`).
- Let `TvPerfManager` scale resolution on weak TVs — don't fight it.
