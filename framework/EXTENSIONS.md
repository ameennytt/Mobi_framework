# Framework Extension Contracts

Extensions are **opt-in game subsystems** that live in a game's `extensions/` folder and
attach a `window.Game<Name>` namespace. They keep large (CricSwing-scale) games organised:
the core stays `gameplay/` (rules · scoring · visuals · index), and heavy subsystems —
motion ML, training, tournaments, analytics, replay — plug in without bloating it.

> **Framework-level input extensions (vs per-game `extensions/`).** There are now two
> **optional** input extensions shipped with the framework itself:
> `framework/extensions/motion-input.js` (`window.FrameworkMotionInput`) and
> `framework/extensions/ml-profile.js` (`window.FrameworkMLProfile`). They are **opt-in
> scaffolds, OFF by default**, loaded only when a game sets `input: "motion"` in
> `game-config.json` (the default input is buttons). They implement the existing **ML/Motion**
> and **Training** contracts described below — see `framework/extensions/README.md` for setup.

## How extensions load + activate

1. Drop the file in `games/<id>/extensions/` (e.g. `extensions/analytics.js`).
2. List it in `game-config.json` `code: [...]` **before** `gameplay/index.js`:
   ```jsonc
   "code": [
     "gameplay/rules.js", "gameplay/scoring.js", "gameplay/visuals.js",
     "extensions/analytics.js",        // ← activate
     "gameplay/index.js"
   ]
   ```
3. `index.js` treats every extension as **optional** — guard on presence so the game still
   runs when an extension is absent:
   ```js
   if (window.GameAnalytics) window.GameAnalytics.track('goal', score.snapshot());
   ```

Rules: one namespace per extension (`window.Game<Name>`); never assume another extension
exists; no framework edits to add one. A file with no entry in `code` is simply inert.

---

## Official contracts

Implement the methods you use; all are optional unless noted. Shapes are intentionally small.

### Analytics — `window.GameAnalytics`
```ts
track(event: string, data?: object): void   // record one event
flush(): void                                // (optional) ship buffered events to a sink
```

### ML / Motion classification — `window.GameML`
```ts
init(opts?: object): Promise<void> | void    // load model/weights
ready(): boolean                             // safe to classify?
classify(sample: object): { label: string, confidence: number }  // e.g. a swing → shot type
```
The controller feeds sensor frames (`FrameworkMotion`); the TV (gameplay) calls `classify`.

### Training — `window.GameTraining`
```ts
start(mode: string): void                    // enter a training mode
feed(sample: object): void                   // give it one input/outcome
progress(): { pct: number, label?: string }  // 0..100 for a HUD/progress bar
stop(): object                               // end → return a summary
```

### Tournament — `window.GameTournament`
```ts
create(config: object): void                 // seed bracket/league from teams + format
recordResult(match: object): void            // post a finished match's result
nextMatch(): object | null                   // the next fixture, or null when done
standings(): Array<{ team: string, points: number, [k: string]: any }>
```

### Replay — `window.GameReplay`
```ts
record(frame: object): void                  // append a frame while playing
start(): void                                // begin a capture
stop(): void                                 // end capture
play(onFrame: (frame: object) => void): void // replay captured frames
export(): object                             // serialisable capture (save/share)
```

---

## Lifecycle + state

- Extensions are plain singletons created at load. Reset per-match state from the game's
  `start()` (call e.g. `GameTraining.start(mode)` there), not at module top level.
- Keep extensions **pure of framework internals** — talk to them only from `gameplay/index.js`.
  This keeps them unit-testable (they can also `module.exports` for Node tests, like
  `gameplay/rules.js`).
- A starter no-op (`GameAnalytics`) ships in `games/versus/extensions/analytics.js` — copy it
  as a template for a new extension.
