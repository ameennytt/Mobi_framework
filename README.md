# TV + Mobile Game Framework

Build **phone-controller + Smart-TV** sports games fast. The phone is the gamepad, the
TV is the screen, and the framework handles all the plumbing — pairing, connection,
reconnect, navigation, the lobby flow, the stadium, the scoreboard, and TV performance.
**You write only the game.**

It started as an extraction of the production cricket game *CricSwing*, generalised so
the same base can host many sports.

---

## 60-second mental model

```
   Phone (controller)            Server (relay)            TV (screen)
   lobby.html + controller.html  framework/core/*          screen.html
        │  taps / inputs              │  forwards              │ draws + scores
        └────────────► send ─────────┴────────► on ───────────┘
                       ◄──────────── score / state ◄───────────
```

- **TV** opens `screen.html`, shows a pairing code, then draws the game.
- **Phone** opens `lobby.html`, the player types the code, picks options, then taps to play.
- **Server** pairs them by code and relays messages instantly. If either side drops, it reconnects.

One call boots any page: **`FrameworkGame.init({ ... })`**.

---

## Quick start

```bash
npm install
npm start            # dev server on http://localhost:3000

# make a game from a template:
npm run new-game mygame --from versus   # football-style (head-to-head)
#   or --from chase   (cricket-style: pick mode → team → format → toss → chase)
#   or --from starter (bare 3-screen shell)
```

Open two tabs (or a TV browser + your phone on the same Wi-Fi):

- TV: `http://localhost:3000/games/mygame/screen.html`  → shows a code
- Phone: `http://localhost:3000/games/mygame/lobby.html` → type the code

That's a working game. Now make it yours.

---

## What a developer edits (just two files)

With a rich template (`chase` / `versus`) you only touch:

```
games/mygame/
├── game-config.json   # names, colors, teams, lobby steps, scoreboard, field  (NO code)
└── gameplay.js        # your rules + what's drawn on the TV  (THE game)
```

`lobby.html`, `controller.html`, `screen.html` are thin (a few lines that boot the
framework) and rarely change.

### `game-config.json` — configure, don't code
```jsonc
{
  "theme": { "--game-accent": "#39ff14", "--game-primary": "#06140c" },  // colors
  "text":  { "APP_TITLE": "My Game", "PRIMARY_SCORE": "Goals" },          // labels
  "teams":   [ { "name": "Red Lions", "short": "RED", "color": "#e0443e" } ],
  "formats": [ { "id": "f5", "name": "Match", "rounds": 5 } ],
  "hud":   "versus",          // scoreboard style: chase | versus | attempt
  "field": "goal",            // field overlay: goal | court | lanes | targetBoard
  "flow": [                   // the lobby screens, in order
    { "type": "pair" },
    { "type": "choice", "key": "team",   "title": "Pick your team",  "source": "teams" },
    { "type": "choice", "key": "format", "title": "Match length",    "source": "formats" },
    { "type": "ceremony", "kind": "kickoff" },
    { "type": "briefing" }
  ]
}
```

### `gameplay.js` — your part (≈150 lines)
```js
window.Gameplay = (function () {
  function start(opts) { /* new game / reset */ }
  function onAction(d) { /* a button was tapped: d.choice — run your rules */ }
  function draw(ctx, W, H) { /* draw your ball / action on the object layer */ }
  return {
    attach: (g) => {}, draw, start, setPaired: (v) => {},
    handlers: { action: onAction, start: (d) => start(d) },
  };
})();
```

Everything else — pairing, the lobby, the stadium, the scoreboard, reconnect — is the
framework's job.

---

## Sport archetypes (mix-and-match in config)

The lobby, scoreboard and field are all data-driven, so different sports reuse the same
engine:

| Archetype | `hud` | Example | Template |
|-----------|-------|---------|----------|
| Chase / target | `chase` | cricket (chase a target) | `games/chase` |
| Head-to-head | `versus` | football (you vs CPU) | `games/versus` |
| Score-attack | `attempt` | bowling / archery (N attempts, beat best) | _config + your gameplay_ |

Add or remove lobby screens with `flow:[...]` — want a toss? add a `ceremony`. Don't want
team selection? remove the `choice`. No flow code.

---

## Project layout

```
framework/        the engine — DO NOT edit (your game lives in games/)
  core/           game.js (boot), server.js + websocket.js (relay), room-manager.js
  services/       event-hub (WS), router, theme, assets, storage
  flow/           lobby-flow.js (config-driven lobby), flow.css
  renderer/       renderer, layer-manager, tv-perf-manager, arena-scene (stadium),
                  fields (goal/court/lanes/target), shot-visuals (ball math)
  ui/             templates (scorebar/result/loading/banner), components (dialog/toast/pairing)
  native/         React Native shell (one APK per game)
  rendezvous/     Cloudflare Worker (per-game pairing website)
games/            your games (chase, versus, starter, …)
mobile/           the native app project (embeds the server + a game)
scripts/          new-game.js, publish.js, bundle.js
DEVELOPER_GUIDE.md  how to build       FRAMEWORK_API.md  every function, what to call
```

---

## Dev vs production pairing

Same game code, one switch (`RENDEZVOUS_URL` in `game-config.json`):

- **Dev (empty):** the TV shows a 6-char code; type it on the phone. Local Wi-Fi only.
- **Production (your domain):** the TV opens your pairing site, the phone enters a short
  code, the site redirects the phone to the TV. Each game ships as its own app + its own
  pairing site. See `framework/rendezvous/README.md`.

---

## Shipping

```bash
npm run publish mygame                 # points the native shell + pairing worker at mygame,
                                       # and refreshes the embedded server payload
cd mobile && npm install && npx react-native run-android   # build the debug APK
# (optional cloud pairing) cd framework/rendezvous && wrangler deploy
```

`publish` wires everything; you only run the build/deploy. (It does not build the APK for
you — that needs your Android SDK.)

---

## Can I build a fully polished game (like CricSwing) on this?

Yes — the base was extracted from CricSwing, so it can host one. But the framework gives
the **shell** (plumbing, lobby, stadium, scoreboard); the **polish** (players, animations,
real physics, swing/ML, levels, art, sound) is the gameplay you write in `gameplay.js`.

- A simple, playable sport: ~a day.
- Full CricSwing-level polish: weeks — that's game design + art + ML, same craft as
  before, minus rebuilding the plumbing every time.

Motion/swing is designed-in (`USE_MOTION`, `FrameworkMotion`), so a button game can become
a swing game later without a rewrite.

---

## Learn more
- **[DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)** — step-by-step build guide.
- **[FRAMEWORK_API.md](FRAMEWORK_API.md)** — every `window.Framework*` global and method.
- **[UI_COMPONENTS.md](UI_COMPONENTS.md)** · **[INPUT_SYSTEM.md](INPUT_SYSTEM.md)** · **[BEST_PRACTICES.md](BEST_PRACTICES.md)**
- Per-template notes: `games/chase/README.md`, `games/versus/README.md`.
