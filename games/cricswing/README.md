# games/chase — chase / target archetype (cricket-style)

A full CricSwing-style flow with the cricket bits kept but generic-named, **no ML and no
swing** (button input). Copy it for any "set a score, then chase it" sport.

```bash
npm run new-game mygame --from chase
```

## The flow (all built by the framework from `game-config.json`)
```
pair → pick mode (Chase Cup / Chase League / Quick) → pick team / region / league+club
     → pick format → pick difficulty → toss → target → play → result
```
This whole journey lives in `framework/flow/lobby-flow.js`, driven by the `flow:[...]`
array in the config. Reorder or delete steps freely.

## What you edit
- **`game-config.json`** — title, colors (`theme`), score labels (`text`), lobby data
  (`modes`, `teams`, `chaseData`, `formats` with `overs`, `difficulties`), the `flow` step
  list, `hud:"chase"`, and `code:[]` (the gameplay load order). The toss target is computed by
  a `mount({ onCeremony })` hook in `lobby.html` (cricket math, kept out of the framework).
- **`gameplay/`** — MODULAR, the only code you write:
  - `rules.js` (`GameRules`) — roll the shot outcome (runs/wicket); swap for real rules.
  - `scoring.js` (`GameScoring`) — runs/balls/wickets + target/overs.
  - `visuals.js` (`GameVisuals`) — build + draw the ball (uses `chase-shot.js` cricket math).
  - `index.js` (`Gameplay`) — wires them + the chase flow.
  - `chase-shot.js` — cricket ball/landing math (listed first in `code:[]`).

## Scoreboard
Uses the `chase` HUD: runs · target · need · run-rate (`FrameworkTemplates.updateScorebar('chase', …)`).

## Run
```bash
npm start
# TV:    http://localhost:3000/games/chase/screen.html
# Phone: http://localhost:3000/games/chase/lobby.html
```

See [DOC/MAKING_A_GAME.md](../../DOC/MAKING_A_GAME.md) and [DOC/FRAMEWORK_API.md](../../DOC/FRAMEWORK_API.md).
