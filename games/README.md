# games/

Each subfolder is one game. Copy a template with `npm run new-game <id> --from <template>`.

All templates share the **same premium look** (CricSwing-grade) and the **same modular
shape**. They differ only in sport shaping.

| Folder | What it is | Start from it when… |
|--------|-----------|---------------------|
| `starter` | Neutral premium template (`attempt` demo: score over N tries). | a new sport — the default base. |
| `chase` | Chase/target archetype (cricket-style): mode → team → format → toss → chase. `hud: chase`. | a "set a score, then chase it" sport (baseball). |
| `versus` | Head-to-head archetype (football, you vs CPU): team → length → kickoff. `hud: versus`, `field: goal`. | a "both sides score" sport (hockey). |

A game is just:
```
games/<id>/
├── game-config.json   # names, colors, lobby steps, hud, field, code[]   (no logic)
├── gameplay/          # YOUR code — rules.js · scoring.js · visuals.js · index.js
├── extensions/        # opt-in add-ons: ml / training / tournament / analytics  (optional)
├── lobby.html · controller.html · screen.html   # thin framework boot
└── assets/
```

**Code layout** — every template ships **modular** (`gameplay/` folder, listed in
`game-config.json` `"code": [ ... , "gameplay/index.js" ]`; `screen.html` calls
`FrameworkGame.loadGameplay()`). Tiny game? Merge into one `gameplay.js` and drop `code:[]` —
the loader supports both.

The framework (in `../framework/`) provides everything else — premium UI, flow, pairing,
screens. Each template has its own README.
