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
- **`game-config.json`** — title, colors, `teams`, `formats` (with `rounds`), and the `flow`.
  `hud` is `"versus"`, `field` is `"goal"` (draws a net + posts on the pitch).
- **`gameplay.js`** — the only code:
  - `handlers.action({choice})` → shoots at the goal (aim left/center/right); keeper save
    chance by difficulty; then the CPU takes its shot; updates both scores.
  - `draw(ctx,W,H)` → flies the ball to the goal mouth (object layer).
  - Ends after `rounds`; `FrameworkArena.celebrate(win)` + result screen.

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
teams/formats, and the shoot/score rules in `gameplay.js`. See the root
[README.md](../../README.md) and [FRAMEWORK_API.md](../../FRAMEWORK_API.md).
