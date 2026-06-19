# games/starter — the bare shell

The smallest base: three screens (welcome → menu → setup) and a tap-to-score sample. No
lobby flow engine, no stadium, no archetype HUD — you wire what you want. Choose this when
you want full control; choose `--from chase` or `--from versus` when you want the polished
flow for free.

```bash
npm run new-game mygame          # copies this shell (starter is the default template)
```

## What you edit (search the files for `EDIT`)
```
games/mygame/
├── game-config.json   # title, colors, score labels
├── lobby.html         # welcome + menu + setup screens
├── controller.html    # phone buttons / inputs
└── screen.html        # TV canvas drawing + game rules
```

You still get for free: pairing, the WebSocket relay, reconnect, theme/asset slots,
`FrameworkGame.init()`, the canvas renderer, and `TvPerfManager`. You can pull in bigger
pieces yourself — `FrameworkArena.install()` for a stadium, `FrameworkFlow.mount()` for a
full lobby, `FrameworkTemplates.renderScorebar()` for a HUD.

## Run
```bash
npm start
# TV:    http://localhost:3000/games/mygame/screen.html
# Phone: http://localhost:3000/games/mygame/lobby.html
```

See the root [README.md](../../README.md) and [FRAMEWORK_API.md](../../FRAMEWORK_API.md).
