# UI Components & Templates Guide

> **This doc = copy-paste recipes.** For exact signatures see
> [FRAMEWORK_API.md](FRAMEWORK_API.md); to build a whole game see
> [MAKING_A_GAME.md](MAKING_A_GAME.md).

Pre-built visual elements so you don't hand-write HTML grids or CSS cards. Two
globals provide them:

- **`FrameworkUI`** (`framework/ui/components.js`) — score card, stat grid, dialog,
  toast, pairing overlay, + premium blocks: crest, pill, card, codeInput, tabs, dots.
- **`FrameworkTemplates`** (`framework/ui/templates.js`) — TV scorebar, result, intro,
  countdown, milestone, banner, loading, disconnect, setup-mirror, + mobile home/pause/
  settings/lobby/controller/calibration shells.

> These are plain method calls on the global objects — **not** `new ClassName()`.
> Load the script, then call the method.

```html
<script src="/framework/ui/components.js"></script>
<script src="/framework/ui/templates.js"></script>
```

---

## 1. Theming

Every component reads the active game's `game-config.json` `theme` block via CSS
vars. Set them once (FrameworkTheme does this on boot); components recolor:

- `--game-primary` — backgrounds / base panels
- `--game-accent` — borders, highlights, primary buttons
- `--game-text` — main text
- `--game-muted` — secondary text/labels
- `--game-success`, `--game-danger` — status colors
- `--game-font` — font family

---

## 2. FrameworkUI components

### ScoreCard
```js
FrameworkUI.renderScoreCard('hud-container', 'Total Runs', 0, 'accent');
// update by calling again with the new value
FrameworkUI.renderScoreCard('hud-container', 'Total Runs', 6, 'accent');
```

### Stat grid
```js
FrameworkUI.renderStatGrid('stats', [
  { label: 'Total Sets', value: '2 - 1' },
  { label: 'Aces', value: 12 },
]);
```

### Confirm dialog (quit / play-again prompts)
```js
FrameworkUI.showConfirmDialog({
  title: 'Quit Match',
  body: 'Exit to the lobby? Progress is lost.',
  confirmText: 'Quit',
  cancelText: 'Keep Playing',
  onConfirm: () => location.href = '/games/tennis/lobby.html',
  onCancel: () => {},
});
```

### Pairing overlay (TV) — usually automatic
`FrameworkGame.init` shows/hides this for you. Manual:
```js
FrameworkUI.renderPairingOverlay('A7Q2K9', 'waiting', '/qr.png'); // 'connecting' | 'failed'
FrameworkUI.hidePairingOverlay();
```

### Toast
```js
FrameworkUI.showToast('Reconnecting…', 2500, /*isError*/ true);
```

### Premium building blocks (return HTML strings — inject where you like)
```js
FrameworkUI.crest({ short: 'IND', color: '#1f7ae0', size: 56 }); // painted team/club badge
FrameworkUI.pill('LIVE', /*accent*/ true);                       // eyebrow / status pill
FrameworkUI.card('<inner html>');                                // gradient card wrapper
FrameworkUI.codeInput({ n: 4 });   FrameworkUI.setCode('RHFW', /*paired*/ true);
FrameworkUI.tabs(['Asia', 'Europe'], 0);                         // pill tabs (groups/brackets)
FrameworkUI.dots(5, 2);                                          // progress dots
```

---

## 3. FrameworkTemplates — TV screens

### Broadcast scorebar (top score + bottom bar)
```js
FrameworkTemplates.renderTVScorebar({ title: 'Chase', chasingLabel: 'Target 30' });
FrameworkTemplates.updateTVScorebar({ runs: 18, balls: 8, overs: 2, target: 30 });
FrameworkTemplates.hideTVScorebar();
```

### Centre banner flash
```js
FrameworkTemplates.showTVBanner('SIX!', '#ffd700');   // auto-fades
```

### Match intro · countdown · milestone
```js
FrameworkTemplates.renderTVIntro({ titleA: 'India', titleB: 'Australia', sub: '5 overs' });
FrameworkTemplates.startTVCountdown(3, () => { FrameworkTemplates.hideTVIntro(); /* start */ });
FrameworkTemplates.showTVMilestone({ kicker: 'MILESTONE', big: '50', sub: 'Half century!' });
```

### Result / game-over (banner gradient + POM slot + stats grid)
```js
FrameworkTemplates.renderTVResult({
  won: true,                       // green banner (false = red)
  icon: '🏆',                      // optional
  bannerText: 'Victory',
  winner: '18/2',
  pom: '<b>Player of the match</b> …', // optional HTML slot (game-supplied)
  stats: [{ label: 'Runs', value: 18 }, { label: 'Target', value: 18 }],
  primaryText: 'PLAY AGAIN',
  onPrimary: () => FrameworkTemplates.hideTVResult(),
  secondaryText: 'QUIT', onSecondary: () => {},
});
```
(`FrameworkGame.init` exposes this as `game.showResult(opts)` / `game.hideResult()`.)

### Loading + disconnected overlays
```js
FrameworkTemplates.renderTVLoading({ logoUrl, message: 'Loading…' });
FrameworkTemplates.updateTVLoading(60);   // %
FrameworkTemplates.hideTVLoading();

FrameworkTemplates.renderTVDisconnected({ message: 'Connection lost' });
FrameworkTemplates.hideTVDisconnected();
```

---

## 4. FrameworkTemplates — mobile shells

```js
FrameworkTemplates.renderMobileHome(container, { title, subtitle, logoUrl, items });   // menu cards
FrameworkTemplates.renderMobilePause({ title, onResume, onQuit });                      // hideMobilePause()
FrameworkTemplates.renderMobileSettings({ title, items, onClose });                     // toggles/actions
FrameworkTemplates.renderMobileLobby(container, { gameTitle, subtitle, onStart, lobbyOptionsHtml });
FrameworkTemplates.renderMobileControllerHUD(container, { gameTitle, primaryStatLabel, secondaryStatLabel, customControlsHtml });
FrameworkTemplates.renderMobileCalibration(container, { title, instructions, onCalibrate });
```

> For a full polished lobby, prefer **`FrameworkFlow.mount()`** (see
> [FRAMEWORK_API.md](FRAMEWORK_API.md)) — it builds the entire flow from config.

---

See [FRAMEWORK_API.md](FRAMEWORK_API.md) for the complete signature list.
