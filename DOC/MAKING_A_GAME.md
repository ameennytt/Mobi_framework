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

### New flow step types (all optional)

Beyond `pair` / `choice` / `ceremony` / `target`|`briefing`, the engine knows these. All
default OFF — a minimal game never lists them:

```jsonc
{ "type": "consent" },   // one-time data-consent modal — content from ui.onboarding.consent;
                         //   auto-skips after the first run. Add "once": false to always show.
{ "type": "intro" },     // one-time onboarding carousel — slides from ui.onboarding.intro
                         //   (or an inline "slides" on the step).
{ "type": "menu", "key": "mode", "source": "modes", "branch": true,
  "entries": [           // mode hub: cards from `source`, plus info buttons
    { "icon": "📖", "label": "How to Play", "action": "help" },
    { "icon": "ℹ️",  "label": "About",       "action": "about" },
    { "icon": "⚙️",  "label": "Settings",    "action": "settings" }
  ] }
```

- `consent` / `intro` are **one-time** (remembered after the first run; `intro` can also read
  a step-level `slides:[...]`).
- `menu` is a branching mode hub; `action:"about"|"help"|"settings"` opens the matching `ui.*`
  block (below).
- The **ceremony** step now shows a **result line** (toss/kickoff outcome).
- The **target/briefing** step now does a **CPU count-up**, plus an optional **series badge**
  and an optional **editable roster** (see below).

---

## 5. Optional config blocks (easy by default, flexible when needed)

Every block here is **optional** and defaults OFF — a minimal game omits them entirely
(`games/starter`). Add only what you want; the framework default input is **buttons**.

**`input`** — `"buttons"` (DEFAULT) or `"motion"`. `"motion"` pulls the optional
motion/ML extension (off by default; see §6 below and `framework/extensions/README.md`).

**`text`** — labels; add `"APP_TAGLINE": "…"` to show a tagline on the native splash.

**`ui`** — onboarding + info modals (drive the `consent` / `intro` / `menu` flow steps):
```jsonc
"ui": {
  "onboarding": {
    "consent": { "title": "…", "body": "…", "acceptText": "Allow", "declineText": "No thanks" },
    "intro":   [ { "icon": "📱", "title": "…", "text": "…" }, … ]   // carousel slides
  },
  "about":    { "title": "…", "body": ["paragraph", …] },
  "help":     { "title": "…", "body": ["step", …] },
  "settings": [ { "label": "Sound", "type": "toggle", "value": true },
                { "label": "Reset",  "type": "button" } ]
}
```

**`roster` / `rosterTitle`** — an editable line-up shown on the `target` step:
```jsonc
"rosterTitle": "Your batting order",
"roster": ["Opener 1", "Opener 2", "No. 3", "No. 4", "No. 5"]
```

**Series / tournament** (per format, or one top-level default) — runs a multi-match state
machine with a badge on the target screen:
```jsonc
"formats": [
  { "id": "f1", "name": "Friendly",   "overs": 1 },                                   // no series
  { "id": "f2", "name": "Series",     "overs": 2, "seriesType": "series",     "bestOf": 3 },
  { "id": "f5", "name": "Tournament", "overs": 2, "seriesType": "tournament", "total":  3 }
]
// or a top-level default: "series": { "type": "series", "bestOf": 3, "total": 3 }
```
If you use series, `lobby.html` and `controller.html` must load
`/framework/flow/series.js`, and `screen.html` loads `/framework/ui/charts.js` for the
chart/HUD widgets.

**`tv`** — broadcast TV screens (each a no-op until flagged on):
```jsonc
"tv": { "intro": true, "countdown": 3, "milestones": true, "overSummary": true }
```
Call the matching `FrameworkTemplates.*` from `gameplay/index.js`, gated on these flags.

Full reference for every optional screen: [SCREENS.md](SCREENS.md).

### Presets

- `games/starter` — **minimal** (buttons, pair → pick → play; no `ui`/`tv`/`series`).
- `games/chase` — **broadcast** (all optional screens on: onboarding, mode hub, series,
  toss, roster, TV intro/countdown/over-summary/milestones).
- `games/versus` — **head-to-head** (broadcast UI, football terms).

```bash
npm run new-game <id> --from chase     # scaffold the rich broadcast preset
npm run new-game <id>                  # default --from starter → minimal (buttons)
```

---

## 6. Full freedom (when the easy path isn't enough)

You are never boxed in:
- **Restyle** anything — override the `--game-*` vars, or add your own CSS in your game's
  HTML/`assets`.
- **Replace a screen** — don't call the framework template; render your own DOM/canvas in
  `screen.html` / `controller.html` / `lobby.html` (they're your files).
- **Custom lobby** — skip `FrameworkFlow` and build the lobby yourself; still use
  `FrameworkGame` for pairing/messaging.
- **Extensions** — add `extensions/` (ml, training, tournament, analytics) and list them in
  `code:[]`. See [../framework/EXTENSIONS.md](../framework/EXTENSIONS.md).
- **Motion/swing** — set `"input":"motion"` + `supportsMotion:true` and load the opt-in
  motion/ML extension (off by default). See [../framework/extensions/README.md](../framework/extensions/README.md).

The framework is the *default*, not a cage. Use the easy path to move fast; reach past it
whenever your game needs something special.

---

## 7. Messaging (phone ↔ TV)

`game.send(type, payload)` → peer's `handlers[type](payload)` (fields arrive top-level).
System messages are automatic (`room_created`, `bat_connected`, `screen_rejoined`, …). Pick
your own lowercase names for game messages (`action`, `game_state`, `game_over`).

---

## 8. The bootstrap (one call per page)

Each surface boots with `FrameworkGame.init({ role, ... })` — TV uses `role:'screen'`, phone
uses `role:'bat'`. `screen.html` also calls `FrameworkGame.loadGameplay()` first (loads your
`gameplay/` from `code:[]`). The thin HTML files already do this; you rarely touch them. Full
signatures + handler list: [FRAMEWORK_API.md](FRAMEWORK_API.md).

## 9. Pairing: dev vs production

Same game code; flip one setting — `RENDEZVOUS_URL` in `game-config.json`:

| | `RENDEZVOUS_URL` | How the TV pairs |
|---|---|---|
| **Dev** | `""` | TV shows a 4-char code; type it on the phone (same Wi-Fi). |
| **Prod** | `"https://play.yourstudio.com"` | TV opens the central hub; phone enters the code; the hub redirects the TV to the phone. |

One central pairing site serves every game — see
[../framework/rendezvous/README.md](../framework/rendezvous/README.md).

## 10. Ship

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
for screen/component recipes, [SCREENS.md](SCREENS.md) for the full optional-screen
reference, [../framework/extensions/README.md](../framework/extensions/README.md) for the
motion/ML opt-in, and [PHILOSOPHY.md](PHILOSOPHY.md) for the framework's intent.
