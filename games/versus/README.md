# games/versus — head-to-head archetype (football, you vs CPU)

Proves the framework beyond cricket: a "both sides score" sport on a single phone. The
sample is a penalty-shootout-style striker duel — you shoot, the keeper dives, then the CPU
shoots; most goals after N rounds wins.

```bash
npm run new-game mygame --from versus
```

## The flow (built from `game-config.json`)
```
pair → pick team → pick match length → kick off → play → result
```
No toss, no overs — that's the point: the same `framework/flow/lobby-flow.js` engine, just a
shorter `flow:[...]` (a `ceremony` of kind `kickoff` instead of `toss`).

## What you edit
- **`game-config.json`** — title, colors, `teams`, `formats` (with `rounds`), the `flow`, and
  `code` (the gameplay load order — see below). `hud` is `"versus"`, `field` is `"goal"`
  (draws a net + posts on the pitch).
- **`gameplay/`** — the code. This template ships **modular** (see next section) to model how
  a large game should be organised.

## Modular game layout (officially supported)

Small games keep a single `gameplay.js`. This football sample is split into a `gameplay/`
folder so rules, scoring and drawing each have a home — the pattern to follow before a game
grows to CricSwing scale.

```
games/versus/
├── game-config.json     # "code": [...]  ← gameplay load order, entry (index.js) last
├── gameplay/
│   ├── rules.js         # window.GameRules    — pure decisions (save %, CPU %, win) — Node-testable
│   ├── scoring.js       # window.GameScoring  — score model (you/cpu/round)
│   ├── visuals.js       # window.GameVisuals  — canvas: keeper, shooter, ball, geometry
│   └── index.js         # window.Gameplay     — entry: composes the above + game flow
└── extensions/          # opt-in add-ons (ml / training / tournament / analytics) — see its README
```

- The framework loads these via `game-config.json` `"code": [...]` (paths relative to the game
  dir, in order, **entry last**). `screen.html` calls `await FrameworkGame.loadGameplay()` once
  before `FrameworkGame.init()`. With **no** `code` field the framework falls back to a single
  `gameplay.js` (a tiny game can still do that). All shipped templates (`starter`, `chase`,
  `versus`) use the modular `gameplay/` layout.
- The framework only ever sees one entry point — `window.Gameplay`
  (`attach/draw/start/setPaired/handlers`). How you split behind it is your call.
- Enable an extension by listing its file in `code` before `index.js`; `index.js` guards on
  presence (`if (window.GameAnalytics) …`). See [extensions/README.md](extensions/README.md).

**The game loop:** `handlers.action({choice})` shoots (aim left/center/right) → `GameRules`
decides save/goal → keeper dives + ball flies (`GameVisuals`) → `GameScoring` updates → CPU
reply shot → after `rounds`, `FrameworkArena.celebrate(win)` + result screen.

## Scoreboard + field
- HUD: `versus` — `You | round | CPU` (`FrameworkTemplates.updateScorebar('versus', {you,cpu,round,rounds})`).
- Field: `goal` overlay from `FrameworkFields`, enabled via `FrameworkArena.install({ field:'goal' })` in `screen.html`.

## Run
```bash
npm start
# TV:    http://localhost:3000/games/versus/screen.html
# Phone: http://localhost:3000/games/versus/lobby.html
```

To make a different head-to-head sport: change `field` (`court` for tennis, etc.), the
teams/formats, and the shoot/score rules in `gameplay/` (start in `rules.js` + `visuals.js`).
