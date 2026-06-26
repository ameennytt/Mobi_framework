# Making a Game

**The deal:** the framework hands you a complete, premium TV + phone game shell. The *easy
path* is to touch only your game's mechanics and let the framework do the rest. But nothing
is locked — you keep **full freedom** to override any screen, restyle anything, or add your
own. Easy by default, open when you need it.

---

## 1. Create

```bash
npm run new-game mygame          # premium starter (recommended base)
#   --from versus   head-to-head ball game (football)
#   --from chase    chase-a-target (cricket)
npm start                        # http://localhost:3000
```

Open TV `…/games/mygame/screen.html`, phone `…/games/mygame/lobby.html`. It already
pairs, runs a full lobby, plays, and shows a result — premium-looking, out of the box.

---

## 2. The easy path — what you edit (≈ everything you need)

```
games/mygame/
├── game-config.json     ← identity + which screens (NO code)
└── gameplay/            ← YOUR game (the only code you write)
    ├── rules.js         outcome of an input        (window.GameRules)
    ├── scoring.js       score state                (window.GameScoring)
    ├── visuals.js       draw your action on the TV (window.GameVisuals)
    └── index.js         wires them + game flow     (window.Gameplay)
```

> Small game? Merge into a single `gameplay.js` and drop `code:[]` — both work.

**`game-config.json`** — configure, don't code:
- `theme` — colors/font (recolors *every* screen)
- `text` — labels (title, score names)
- `hud` — scorebar style: `chase` | `versus` | `attempt`
- `field` — pitch overlay: `goal` | `court` | `lanes` | `targetBoard` | `""`
- `flow` — the lobby **screens, in order** (see §4)
- `teams` / `formats` / `difficulties` / `modes` — data the lobby picks from

**`gameplay/`** — your 4 slots. The framework calls them; you fill them:
- `start(opts)` — new game / reset
- `onAction(d)` — a controller input arrived (`d` = what `controller.html` sent)
- `draw(ctx,W,H)` — paint your action (arena draws the stadium/field for you)
- `handlers` — which messages you react to

---

## 3. What you get FREE (never rebuild these)

Pairing · lobby flow · reconnect · TV stadium + particles/fireworks/trophy · perf scaling.
Plus ready screens (`window.FrameworkTemplates.*`), all theme-driven:

| TV | Mobile |
|----|--------|
| pairing overlay · setup-mirror | home menu · lobby |
| match intro · 3-2-1 countdown | calibration · controller HUD |
| scorebar (chase/versus/attempt) | pause · settings |
| banner · milestone flash | loading · toast |
| result · celebration · loading · disconnect | confirm dialog |

Call e.g. `FrameworkTemplates.startTVCountdown(3, onDone)` or `renderMobilePause({onResume})`.

---

## 4. Add / remove screens — just edit `flow`

The lobby is a list in `game-config.json`. Each entry = one screen.

```jsonc
"flow": [
  { "type": "pair" },                                       // TV-code pairing
  { "type": "choice", "key": "team",   "source": "teams" }, // a picker
  { "type": "choice", "key": "format", "source": "formats" },
  { "type": "ceremony", "kind": "toss" },                   // coin/kickoff
  { "type": "briefing" }                                    // ready → PLAY
]
```

- **Remove a screen** → delete its line.
- **Add one** → insert a `choice` / `ceremony` step.
- A `ceremony` can run game-specific logic via `mount({ onCeremony })` (e.g. cricket builds a
  target there — see `games/cricket/lobby.html`).

No flow code — the engine builds it.

---

## 5. Full freedom (when the easy path isn't enough)

You are never boxed in:
- **Restyle** anything — override the `--game-*` vars, or add your own CSS in your game's
  HTML/`assets`.
- **Replace a screen** — don't call the framework template; render your own DOM/canvas in
  `screen.html` / `controller.html` / `lobby.html` (they're your files).
- **Custom lobby** — skip `FrameworkFlow` and build the lobby yourself; still use
  `FrameworkGame` for pairing/messaging.
- **Extensions** — add `extensions/` (ml, training, tournament, analytics) and list them in
  `code:[]`. See [../framework/EXTENSIONS.md](../framework/EXTENSIONS.md).
- **Motion/swing** — set `supportsMotion:true` + use `FrameworkMotion` (off by default).

The framework is the *default*, not a cage. Use the easy path to move fast; reach past it
whenever your game needs something special.

---

## 6. Messaging (phone ↔ TV)

`game.send(type, payload)` → peer's `handlers[type](payload)` (fields arrive top-level).
System messages are automatic (`room_created`, `bat_connected`, `screen_rejoined`, …). Pick
your own lowercase names for game messages (`action`, `game_state`, `game_over`).

---

## 7. The bootstrap (one call per page)

Each surface boots with `FrameworkGame.init({ role, ... })` — TV uses `role:'screen'`, phone
uses `role:'bat'`. `screen.html` also calls `FrameworkGame.loadGameplay()` first (loads your
`gameplay/` from `code:[]`). The thin HTML files already do this; you rarely touch them. Full
signatures + handler list: [FRAMEWORK_API.md](FRAMEWORK_API.md).

## 8. Pairing: dev vs production

Same game code; flip one setting — `RENDEZVOUS_URL` in `game-config.json`:

| | `RENDEZVOUS_URL` | How the TV pairs |
|---|---|---|
| **Dev** | `""` | TV shows a 4-char code; type it on the phone (same Wi-Fi). |
| **Prod** | `"https://play.yourstudio.com"` | TV opens the central hub; phone enters the code; the hub redirects the TV to the phone. |

One central pairing site serves every game — see
[../framework/rendezvous/README.md](../framework/rendezvous/README.md).

## 9. Ship

```bash
npm run lint && npm test         # syntax sweep + run tests before shipping
npm run publish mygame           # generates games/mygame/app (RN + embedded; per-game appId)
cd games/mygame/app && npm install && npx react-native run-android
node scripts/tv-link.js mygame   # TV URL (USB-proof) for testing
```

Iterating on-device after edits? `npm run sync mygame` re-embeds `framework/` + your game into
the existing app (no full rebuild). `publish` also sets a unique Android `applicationId`
(`com.tvgame.<id>`, or `android.appId` in config) so multiple games install side-by-side.

See [FRAMEWORK_API.md](FRAMEWORK_API.md) for every API, [UI_COMPONENTS.md](UI_COMPONENTS.md)
for screen/component recipes, and [PHILOSOPHY.md](PHILOSOPHY.md) for the framework's intent.
