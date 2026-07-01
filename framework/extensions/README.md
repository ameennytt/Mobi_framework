# Framework-level optional input extensions

These are **opt-in** subsystems shipped with the framework (vs per-game extensions in
`games/<id>/extensions/`). They power richer **input** for games that want it. The
framework default is **buttons** — none of these load unless a game asks.

| File | Global | What it is | Status |
|------|--------|-----------|--------|
| `motion-input.js` | `window.FrameworkMotionInput` | sensor-permission + stance screens, swing detection | **scaffold** (stubbed) |
| `ml-profile.js` | `window.FrameworkMLProfile` | per-player ML classify + training hub / net practice | **scaffold** (stubbed) |

## Default: buttons (nothing here loads)
A normal game uses tap/choice controls (`game.send('action', …)`). Its `controller.html`
does **not** include these scripts, and its `game-config.json` has no `input` field (or
`input: "buttons"`). Zero motion/ML code reaches the device.

## Enabling motion (future)
1. Set `"input": "motion"` and `"supportsMotion": true` in `game-config.json`.
2. In `controller.html`, add the scripts **before** your controller logic:
   ```html
   <script src="/framework/extensions/motion-input.js"></script>
   <script src="/framework/extensions/ml-profile.js"></script>
   ```
3. Wire on pair:
   ```js
   FrameworkMotionInput.mount({ onSwing: (s) => game.send('action', s) });
   await FrameworkMotionInput.requestPermissionUI();
   await FrameworkMotionInput.stanceLockUI();
   FrameworkMotionInput.start();
   ```

## The screens already exist (UI done, logic stubbed)
The full motion/swing/training **UI** ships in `framework/ui` and renders only when called —
so the only thing left to write is the sensor math. Available now:

- Phone: `renderMobileCameraHint`, `renderMobileStance` (+ `updateMobileStance(pct,ready)`),
  `renderMobilePitchControl` (+ `updateMobilePitchTiming`/`setMobilePitchStatus`),
  `renderMobileTrainingHub`.
- TV: `renderTVStance` (+ `updateTVStance`), `renderTVTimingRing` (+ `updateTVTimingRing`),
  `renderTVBallBrief`, `renderTVTrainGuide` / `renderTVTrainComplete`.
- Extension entry points: `FrameworkMotionInput.cameraHintUI()` / `stanceLockUI()`,
  `FrameworkMLProfile.trainingHubUI({shots,onPick,onAll})`.

`stanceLockUI()` now drives `renderMobileStance` (the scaffold auto-ramps the hold bar; the
real build feeds sensor steadiness into `updateMobileStance`). A bowl/pitch controller calls
`renderMobilePitchControl({label:'PITCH'|'BOWL', onFire})` and animates the timing bar.

## Status: logic scaffold only
`classify` returns a neutral result, swing detection is a `TODO`, training is a no-op
counter. The **screens are real**; the model/sensor logic (e.g. Baseball's) drops in here
without changing the framework or any button game. Contracts: see
[`framework/EXTENSIONS.md`](../EXTENSIONS.md) → ML/Motion + Training.
