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
FrameworkTemplates.showTVMilestone({ kicker: 'Milestone', big: 50, sub: 'runs', color: '#ffd700' });
```

### Over / round summary + interval break (auto-advance overlays)
```js
// end-of-over recap: stat tiles + ball-by-ball pills, auto-closes after `seconds`
FrameworkTemplates.renderTVOverSummary({
  title: 'End of Over 3',
  score: '42/1',
  stats: [{ label: 'This over', value: 8 }],
  balls: [{ label: '4', color: '#2faa55' }],   // ball pills
  seconds: 3,                                   // onDone?: () => {}
});

// innings / strategic-timeout break with countdown
FrameworkTemplates.renderTVBreak({
  kind: 'innings',                 // labels the break
  title: 'Innings break',
  stats: [{ label: 'Runs', value: 88 }],
  seconds: 30,                     // onDone?: () => {}
});
```

### Phone-away + re-pair overlays (disconnect handling)
```js
FrameworkTemplates.renderTVAway({ message: 'Player stepped out' });   // soft, mid-match
FrameworkTemplates.renderTVRepair({                                   // permanent drop
  code: 'AB12',
  onRepair: () => {/* show pairing again */},
  onWait:   () => {/* keep waiting */},
});
```

### Pre-match intro + 3-2-1 (one call)
```js
// team-vs-team intro, holds ~2.2s, then 3-2-1 countdown, then onDone
FrameworkTemplates.runTVPreMatch(
  { titleA: 'You', titleB: 'CPU', sub: 'Chasing 142', countdownFrom: 3 },
  () => { /* start play */ }
);
```

### Result / game-over (banner gradient + POM slot + stats grid)
```js
FrameworkTemplates.renderTVResult({
  won: true,                       // green banner (false = red)
  icon: '🏆',                      // optional
  bannerText: 'Victory',
  winner: '18/2',
  // optional full-broadcast dual scoreboard (winner card glows gold)
  scoreboard: {
    user: { name: 'You', score: '142/4', color: '#1f7ae0', winner: true },
    opp:  { name: 'CPU', score: '138/8', color: '#e03a3a' },
  },
  pom: '<b>Player of the match</b> …', // optional HTML slot (game-supplied)
  quote: { text: 'Held the nerve under pressure.', by: 'Commentary' }, // optional
  series: { label: 'Best of 3', userWins: 2, cpuWins: 1 },             // optional progress strip
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

### In-match phone widgets (all opt-in — default controller is just buttons)
```js
// coach cards swiped before/during a match
FrameworkTemplates.renderMobileTips({
  slides: [{ icon: '🏏', title: 'Time it', text: 'Tap as the ball arrives.' }],
  onDone: () => {},
});

FrameworkTemplates.showMobileResult({ text: 'SIX!', color: '#F3D86B' });   // center flash

// pass-the-phone handoff countdown
FrameworkTemplates.renderMobileHandoff({
  title: 'Pass the phone', next: 'Player 2', seconds: 3, onReady: () => {},
});

FrameworkTemplates.renderMobileQuitConfirm({ onQuit: () => {}, onStay: () => {} });  // exit-match

// editable roster (mutates a name list, fires onChange with the new list)
FrameworkTemplates.renderMobileTeamEdit(container, {
  title: 'Line-up', names: ['You', 'Player 2'], onChange: (list) => {},
});
```

---

## 5. FrameworkCharts — broadcast HUD widgets

Optional broadcast graphics. Load the script, then render into a DOM host (element or
id). Each is a no-op if unused — gate on `tv.*` config flags. Cross-ref
[SCREENS.md](SCREENS.md) ("Broadcast widgets").

```html
<script src="/framework/ui/charts.js"></script>
```

```js
FrameworkCharts.manhattan(hostEl, [{ runs: 6 }, { runs: 12, wkt: true }]);  // per-over bars
FrameworkCharts.wagonWheel(hostEl, [{ angle: 30, power: 0.9, color: '#F3D86B' }]); // shot map
FrameworkCharts.winProbBar(hostEl, 64);                                     // % win bar
FrameworkCharts.runPie(hostEl, { dots: 10, ones: 8, bnd: 5 });              // scoring breakdown
FrameworkCharts.overPills(hostEl, [{ label: '4', color: '#2faa55' }]);      // ball-by-ball pills
FrameworkCharts.commentaryCard(hostEl, { result: 'FOUR', text: 'Driven through covers.' });
```

> `hostEl` may be a DOM element or an element id string.

---

See [FRAMEWORK_API.md](FRAMEWORK_API.md) for the complete signature list.
