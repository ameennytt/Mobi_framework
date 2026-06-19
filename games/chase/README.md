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
- **`game-config.json`** — title, colors (`theme`), score labels (`text`), and the lobby
  data: `modes`, `teams`, `chaseData` (cup regions + leagues), `formats` (with `overs`),
  `difficulties`, and the `flow` step list. `hud` is `"chase"`.
- **`gameplay.js`** — the only code. The sample is a button game:
  - `handlers.action({choice})` → rolls a shot via `ShotVisuals`, flies the ball across the
    `FrameworkArena` stadium, adds runs, chases `target`.
  - `draw(ctx,W,H)` → draws the moving ball (object layer; the stadium draws itself).
  - Replace the roll with real rules; later flip to motion/swing.

## Scoreboard
Uses the `chase` HUD: runs · target · need · run-rate (`FrameworkTemplates.updateScorebar('chase', …)`).

## Run
```bash
npm start
# TV:    http://localhost:3000/games/chase/screen.html
# Phone: http://localhost:3000/games/chase/lobby.html
```

See the root [README.md](../../README.md) and [FRAMEWORK_API.md](../../FRAMEWORK_API.md).
