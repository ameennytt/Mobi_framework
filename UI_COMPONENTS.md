# UI Components & Templates Guide

Pre-built visual elements so you don't hand-write HTML grids or CSS cards. Two
globals provide them:

- **`FrameworkUI`** (`framework/ui/components.js`) — score card, stat grid, dialog,
  toast, pairing overlay.
- **`FrameworkTemplates`** (`framework/ui/templates.js`) — TV scorebar, result,
  loading, banner, disconnected overlay, and mobile page shells.

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

### Result / game-over
```js
FrameworkTemplates.renderTVResult({
  bannerText: 'Victory',
  winner: '18/2',
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
FrameworkTemplates.renderMobileLobby(container, { gameTitle, subtitle, onStart, lobbyOptionsHtml });
FrameworkTemplates.renderMobileControllerHUD(container, { gameTitle, primaryStatLabel, secondaryStatLabel, customControlsHtml });
FrameworkTemplates.renderMobileCalibration(container, { title, instructions, onCalibrate });
```

> For a full polished lobby, prefer **`FrameworkFlow.mount()`** (see
> [FRAMEWORK_API.md](FRAMEWORK_API.md)) — it builds the entire flow from config.

---

See [FRAMEWORK_API.md](FRAMEWORK_API.md) for the complete signature list.
