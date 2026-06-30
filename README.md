# TV + Mobile Game Framework

Build **phone-controller + Smart-TV** sports games fast. The phone is the gamepad, the TV is
the screen, and the framework handles all the plumbing — pairing, connection, reconnect,
navigation, the lobby flow, the stadium, the scoreboard, premium UI, and TV performance.
**You write only the game.**

Extracted and generalised from the production cricket game *CricSwing*, so the same premium
base hosts many sports.

---

## 60-second model

```
   Phone (controller)            Server (relay)            TV (screen)
   lobby.html + controller.html  framework/core/*          screen.html
        │  taps / inputs              │  forwards              │ draws + scores
        └────────────► send ─────────┴────────► on ───────────┘
                       ◄──────────── score / state ◄───────────
```

- **TV** opens `screen.html`, shows a 4-char pairing code, then draws the game.
- **Phone** opens `lobby.html`, types the code, picks options, then taps to play.
- **Server** pairs them by code and relays messages instantly; reconnects if either drops.

One call boots any page: **`FrameworkGame.init({ ... })`**.

---

## Quick start

```bash
npm install
npm start                         # dev server on http://localhost:3000

npm run new-game mygame           # premium starter (any sport)
#   --from chase    cricket-style chase
#   --from versus   football-style head-to-head

npm test                          # run all tests        npm run lint   # syntax sweep
```

- TV: `http://localhost:3000/games/mygame/screen.html` → shows a code
- Phone: `http://localhost:3000/games/mygame/lobby.html` → type the code

That's a working, premium-looking game. Now make it yours.

---

## What a developer edits

```
games/mygame/
├── game-config.json   # name, colors, teams, lobby steps, hud, field   (no logic)
└── gameplay/          # YOUR code — rules.js · scoring.js · visuals.js · index.js
```

Everything else — pairing, lobby, premium screens, scoreboard, reconnect — is the framework's
job. Recolour in `theme`; add/remove lobby screens in `flow:[]`; ship with `npm run publish`.

The 3 templates (`starter`, `chase`, `versus`) share **one premium look** and the **same
modular shape** — they differ only in sport shaping.

---

## The full screen set (all opt-in)

The framework now ships the **complete CricSwing-style optional screen set**. Every screen is
opt-in — the **default is buttons + a minimal flow**, and you turn richer screens on with flags
in `game-config.json` (see **[DOC/SCREENS.md](DOC/SCREENS.md)**):

- **Onboarding** — consent + intro carousel
- **Mode hub** — with About / Help
- **Coin toss**
- **Editable roster**
- **Series + tournament progression**
- **TV match-intro + 3-2-1 countdown**
- **Milestone flashes** + **over-summary**
- **Full broadcast match-end** — dual scoreboard + player-of-match + quote + series
- **Broadcast chart widgets**
- **Animated native splash**

Principle: **easy by default, flexible when needed, unlimited if desired.** Presets show both
ends: **`games/starter` = minimal**, **`games/chase` = broadcast demo** with the rich screens on.

---

## Documentation

| Doc | Read it for |
|-----|-------------|
| **[DOC/PHILOSOPHY.md](DOC/PHILOSOPHY.md)** | the vision + how you're meant to use the framework |
| **[DOC/MAKING_A_GAME.md](DOC/MAKING_A_GAME.md)** | step-by-step: build a game (the main guide) |
| **[DOC/FRAMEWORK_API.md](DOC/FRAMEWORK_API.md)** | every `window.Framework*` global + method (reference) |
| **[DOC/UI_COMPONENTS.md](DOC/UI_COMPONENTS.md)** | copy-paste UI recipes (screens + components) |
| **[DOC/SCREENS.md](DOC/SCREENS.md)** | every optional screen + the config flag that turns it on |
| **[DOC/INPUT_SYSTEM.md](DOC/INPUT_SYSTEM.md)** | controller input + motion/swing |
| **[DOC/BEST_PRACTICES.md](DOC/BEST_PRACTICES.md)** | performance + messaging tips |
| **[framework/EXTENSIONS.md](framework/EXTENSIONS.md)** | opt-in subsystems (ml/training/tournament/analytics) |
| **[games/README.md](games/README.md)** | the templates index |

Per-shipping: **[framework/native/README.md](framework/native/README.md)** (APK) ·
**[framework/rendezvous/README.md](framework/rendezvous/README.md)** (central pairing site).

---

## Philosophy

> **Easy by default. Flexible when needed. Unlimited if desired.**

The framework owns the frame; the game owns the content. See
[DOC/PHILOSOPHY.md](DOC/PHILOSOPHY.md).
