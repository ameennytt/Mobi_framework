# games/

Each subfolder is one game. Copy a template with `npm run new-game <id> --from <template>`.

| Folder | What it is | Start from it when… |
|--------|-----------|---------------------|
| `chase` | Chase/target archetype (cricket-style): mode → team → format → toss → chase. `hud: chase`. | you want a "set a score, then chase it" sport. |
| `versus` | Head-to-head archetype (football, you vs CPU): team → length → kickoff. `hud: versus`, `field: goal`. | you want a "both sides score" sport. |
| `starter` | Bare 3-screen shell (welcome → menu → setup). | you want maximum control and minimal scaffolding. |

A game is just:
```
games/<id>/
├── game-config.json   # names, colors, lobby steps, hud, field, code   (no logic)
├── gameplay.js        # your rules + draw — SIMPLE games (e.g. chase)
│   └── …or…
├── gameplay/          # MODULAR games (e.g. versus): rules.js · scoring.js · visuals.js · index.js
├── extensions/        # MODULAR opt-in add-ons: ml / training / tournament / analytics
├── lobby.html · controller.html · screen.html   # thin framework boot
└── assets/
```

**Simple vs modular code** — pick per game, no framework change:
- **Simple:** one `gameplay.js` (default; what `chase` uses).
- **Modular:** a `gameplay/` folder + `game-config.json` `"code": [ ... , "gameplay/index.js" ]`
  listing the load order (entry last). `screen.html` calls `FrameworkGame.loadGameplay()`. Use
  this for large (CricSwing-scale) games so rules/scoring/visuals/ml don't pile into one file.
  See `versus/` and `versus/extensions/README.md`.

The framework (in `../framework/`) provides everything else. Each rich template has its own README.
