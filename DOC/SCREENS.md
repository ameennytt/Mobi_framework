# Screens & flows — what's optional and how to turn it on

The framework ships the **full CricSwing-style screen set**, but every premium screen is
**opt-in**. The default new game is **buttons + a minimal flow** (pair → pick → play). You
switch richer screens on in `game-config.json` — no flow code. Principle: *easy by default,
flexible when needed, unlimited if desired.*

`games/chase` is the **broadcast preset** (everything on) — copy it to see the full set.
`games/starter` is the **minimal preset** (buttons only).

## Lobby steps (`flow: [...]`)
Each entry is a screen the engine builds in order. Types:

| Step | Shows | Notes |
|------|-------|-------|
| `{ type:"pair" }` | TV-code entry + Wi-Fi hint | required, first |
| `{ type:"consent" }` | one-time data-consent modal | content from `ui.onboarding.consent`; auto-skips after first run (`once:false` to always show) |
| `{ type:"intro" }` | N-slide onboarding carousel | slides from `ui.onboarding.intro` (or step `slides`); one-time |
| `{ type:"menu", key, source, branch, entries }` | mode hub (cards + About/Help) | `entries:[{icon,label,action:"about"\|"help"\|"settings"}]` |
| `{ type:"choice", key, source, when, tabs, branch }` | a card-pick grid | `source`: `teams`/`formats`/`modes`/`difficulties`/path/`$league.teams`; `when:{key,equals}` gates it; `tabs:"field"` groups |
| `{ type:"ceremony", kind:"toss"\|"kickoff" }` | coin/whistle + result line | toss = styled gold disc + "Time for the toss"; game's `onCeremony(kind,S)` merges extra state (e.g. chase target) |
| `{ type:"target" }` / `{ type:"briefing" }` | summary + PLAY | CPU count-up, optional series badge, optional editable roster |

Choice-step extras (optional, CricSwing difficulty screen): `"cols":3` (N-column grid),
`"preview":true` (VS match-preview card from the picked team/opponent), `"confirm":true`
+ `"confirmText"` (don't auto-advance — a tap selects, a Start button advances).

Roster on the target step: set `roster:[...]` + `rosterTitle` in config → editable line-up.
Entries may be plain strings **or** `{ "name":"…", "role":"BAT" }` — a role badge shows per row
and row 1 is highlighted as the next player.

## Series & tournament (optional)
Mark a format with a series type — the framework runs the multi-match state machine
(`framework/flow/series.js`, badge on the target screen, standings for match-end):
```jsonc
{ "id":"f2", "name":"Series", "overs":2, "seriesType":"series", "bestOf":3 }
{ "id":"f5", "name":"Tournament", "overs":2, "seriesType":"tournament", "total":3 }
```
Load `framework/flow/series.js` in `lobby.html`. Friendly = a format with no `seriesType`.

## TV screens (`tv: {...}` + `FrameworkTemplates`)
Call these from `gameplay/index.js`; gate them on config flags. All are no-ops if unused.

| Screen | Call | Enable |
|--------|------|--------|
| Pre-match intro + 3-2-1 | `runTVPreMatch({titleA,titleB,sub,countdownFrom}, onDone)` | `tv.intro`, `tv.countdown` |
| Milestone flash | `showTVMilestone({kicker,big,sub,color})` | `tv.milestones` |
| Over/round summary | `renderTVOverSummary({title,score,stats,balls,seconds,onDone})` | `tv.overSummary` |
| Interval / break | `renderTVBreak({kind,title,stats,seconds,onDone})` | `tv.breaks` |
| Match-end (full) | `showResult({won,winner,scoreboard,pom,quote,series,stats,primaryText,onPrimary})` | always available |
| Phone-away overlay | `renderTVAway({message})` | on `bat_disconnected` mid-match |
| Re-pair prompt | `renderTVRepair({code,onRepair,onWait})` | on permanent disconnect |

## Broadcast widgets (`framework/ui/charts.js`)
Optional HUD widgets — render into a DOM host (load `charts.js` in `screen.html`):
`FrameworkCharts.wagonWheel/manhattan/winProbBar/runPie/overPills/commentaryCard`.

## In-match controller (phone) — `FrameworkTemplates` mobile
Default controller = buttons. Opt-in pieces:
`renderMobilePause`, `renderMobileQuitConfirm`, `renderMobileTips({slides,onDone})`,
`showMobileResult({text,sub,color})`, `renderMobileHandoff({title,next,seconds,onReady})`,
`renderMobileAway({message})` (TV-gone overlay), and the rich match-end card
`renderMobileMatchEnd({won,title,sub,stats,scoreboard,quote,series,primaryText,onPrimary,
secondaryText,onSecondary})` (stat tiles + series dots + quote + two buttons).

## Home screen (`home: {...}` + `FrameworkHome`)
The phone app's front door, built by `FrameworkHome.mount()` from `home.html` (a stub). The
menu auto-builds from what the config declares — **Play** always (→ `lobby.html`), plus **How
to Play** / **About** / **Settings** when `ui.help` / `ui.about` / `ui.settings` exist. Override
the list with `home.items:[{label,sub,icon,action:"play"|"help"|"about"|"settings"|<url>}]`.
`home.splash:true` shows a brief themed logo splash on open. The native shell (`App.tsx`) boots
on `home.html`.

## In-match controller (`controller: {...}` + `FrameworkController`)
The framework owns the in-match phone controller — shell, HUD, pause, connection chip, resume,
match-end. `controller.html` is a stub (`FrameworkController.mount()`); you declare the controls:

| Field | Shows | Notes |
|-------|-------|-------|
| `hud:[{key,label}]` | score cards | each reads `game_state[key]` (or map in `onState`) |
| `groups:[{key,options:[{id,label,default}]}]` | selectable button row(s) | current pick stored per `key` (e.g. aim) |
| `actions:[{id,label,primary,payload}]` | action button(s) | tap → `game.send('action', { ...selections, ...payload })` |
| `hint` | tip line under the controls | |
| `code:["gameplay/controller.js"]` | (optional) loads sport-specific hooks | |

Sport-specific match logic goes in **`gameplay/controller.js`** as `window.Gameplay.controller`
(all optional): `startPayload(params)`, `start(api)`, `onState(state,api)`, `onOver(data,api)`,
`onAction(id,sel,api)`, `tips`, `resumeOnReconnect`. The `api` exposes `send/action/setHud/
applyState/setStatus/flash/matchEnd/startMatch/toLobby/toHome/series/params`. Default behaviour
(no hooks) maps HUD by key, forwards `target/overs/attempts/rounds/difficulty` URL params to
`start`, and renders a generic Play-Again/Home match-end — so a simple game needs **zero JS**
(see `games/starter`). Advanced: `mount({controlsHtml})` injects custom DOM; `mount({render})`
replaces the whole shell.

## Series progress dots
`FrameworkSeries.standings()` now returns `results:[]` (`'win'`/`'loss'` per match) +
`total`. Both `renderTVResult` and `renderMobileMatchEnd` render M1✗/M2●/M3◌ dots from it
when a series is active (helper: `FrameworkTemplates._seriesDots(standings)`).

## Motion / swing / training screens (OPTIONAL — OFF by default)
Buttons are default; these render only when a game calls them (gate behind `input:"motion"`
or your own `tv.*`/`training` flags). UI lives in `framework/ui`, logic in
`framework/extensions/` (`motion-input.js`, `ml-profile.js` — scaffold stubs). Reusable by
Baseball (pitch/timing) and a future cricket swing mode.

| Screen | Call | Side |
|--------|------|------|
| Camera hint | `renderMobileCameraHint({onAck})` | phone |
| Stance lock (hold bar + LOCK) | `renderMobileStance({onLock})` + `updateMobileStance(pct,ready)` | phone |
| Bowl/pitch control + timing bar | `renderMobilePitchControl({label,onFire})` + `updateMobilePitchTiming(pct)` / `setMobilePitchStatus(t)` | phone |
| Training hub | `renderMobileTrainingHub({shots,onPick,onAll})` | phone |
| Stance mirror | `renderTVStance({art,holdPct})` + `updateTVStance(pct)` | TV |
| Timing ring | `renderTVTimingRing({sweet})` + `updateTVTimingRing(progress)` | TV |
| Ball/pitch brief + intel chips | `renderTVBallBrief({name,hint,chips})` | TV |
| Train guide / complete | `renderTVTrainGuide({shot,dir})` · `renderTVTrainComplete()` | TV |

Extension entry points: `FrameworkMotionInput.cameraHintUI()/stanceLockUI()`,
`FrameworkMLProfile.trainingHubUI({shots,onPick,onAll})`. See
[`framework/extensions/README.md`](../framework/extensions/README.md).

## Native splash (`App.tsx` / `publish.js`)
Animated brand splash (logo, glow, progress bar) ships in the app-template and is
brand-swapped per game by `npm run publish <id>` (name/accent/bg/tagline from config).

## Motion / swing / ML (future, off by default)
Buttons are default. To go motion: `"input":"motion"`, `"supportsMotion":true`, and load
`framework/extensions/motion-input.js` + `ml-profile.js` in `controller.html`. These are
**scaffolds** — see [`framework/extensions/README.md`](../framework/extensions/README.md).
