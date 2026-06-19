# games/

Each subfolder is one game. Copy a template with `npm run new-game <id> --from <template>`.

| Folder | What it is | Start from it when… |
|--------|-----------|---------------------|
| `chase` | Chase/target archetype (cricket-style): mode → team → format → toss → chase. `hud: chase`. | you want a "set a score, then chase it" sport. |
| `versus` | Head-to-head archetype (football, you vs CPU): team → length → kickoff. `hud: versus`, `field: goal`. | you want a "both sides score" sport. |
| `starter` | Bare 3-screen shell (welcome → menu → setup). | you want maximum control and minimal scaffolding. |
| `cricswing` | The original full game (motion + ML). | reference only — see how a finished, polished game looks. |

A game is just:
```
games/<id>/
├── game-config.json   # names, colors, lobby steps, hud, field   (no code)
├── gameplay.js        # your rules + draw                         (rich templates)
├── lobby.html · controller.html · screen.html   # thin framework boot
└── assets/
```

The framework (in `../framework/`) provides everything else. See the root
[README.md](../README.md), [DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md), and
[FRAMEWORK_API.md](../FRAMEWORK_API.md). Each rich template also has its own README.
