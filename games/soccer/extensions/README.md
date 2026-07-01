# extensions/ — opt-in game subsystems

Large games (CricSwing-scale) grow subsystems that don't belong in the core
rules/scoring/visuals: **ml/** (motion/swing classification), **training/**,
**tournament/**, **analytics/**, audio, etc. Keep each here so the core stays small
and each subsystem can be developed and tested on its own.

## How an extension loads

Extensions are plain scripts that attach a namespace to `window` (e.g.
`window.GameAnalytics`). They are **opt-in**: add them to `game-config.json`
`code: [...]` *before* `gameplay/index.js`, then `index.js` can use them if present.

```jsonc
"code": [
  "gameplay/rules.js",
  "gameplay/scoring.js",
  "gameplay/visuals.js",
  "extensions/analytics.js",   // ← enable an extension by listing it
  "gameplay/index.js"
]
```

`index.js` should treat extensions as optional:

```js
if (window.GameAnalytics) window.GameAnalytics.track('goal', score.snapshot());
```

So a game works with the extension absent, and gains behaviour when it's listed.

`analytics.js` in this folder is a no-op example you can copy. It is **not** in
the default `code` list — the football sample ships lean.

## Official contracts

Each extension type has a documented interface (namespace + methods) — Analytics, ML,
Training, Tournament, Replay. Implement only what you use; the game must run with the
extension absent. See **[../../../framework/EXTENSIONS.md](../../../framework/EXTENSIONS.md)**.
