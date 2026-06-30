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
| `{ type:"ceremony", kind:"toss"\|"kickoff" }` | coin/whistle + result line | game's `onCeremony(kind,S)` merges extra state (e.g. chase target) |
| `{ type:"target" }` / `{ type:"briefing" }` | summary + PLAY | CPU count-up, optional series badge, optional editable roster |

Roster on the target step: set `roster:[...]` + `rosterTitle` in config → editable line-up.

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
`showMobileResult({text,sub,color})`, `renderMobileHandoff({title,next,seconds,onReady})`.

## Native splash (`App.tsx` / `publish.js`)
Animated brand splash (logo, glow, progress bar) ships in the app-template and is
brand-swapped per game by `npm run publish <id>` (name/accent/bg/tagline from config).

## Motion / swing / ML (future, off by default)
Buttons are default. To go motion: `"input":"motion"`, `"supportsMotion":true`, and load
`framework/extensions/motion-input.js` + `ml-profile.js` in `controller.html`. These are
**scaffolds** — see [`framework/extensions/README.md`](../framework/extensions/README.md).
