# Overrides — customize or replace any framework surface

The framework gives you a polished default for everything; nothing is a cage. There are three
escalation levels — reach only as deep as your game needs.

> **Easy by default. Flexible when needed. Unlimited if desired.**

---

## Level 1 — Configure (most games stop here)

Change behaviour/appearance with `game-config.json`, no code:

| Surface | Config |
|---------|--------|
| Whole-app colors (TV + phone) | `theme: { "--game-accent": "#…", "--game-secondary": "#…", … }` |
| Home menu | `home: { items:[…], splash:true }` |
| Lobby screens | `flow: [ … ]` |
| In-match controls + HUD | `controller: { hud, groups, actions, hint }` |
| Scoreboard archetype | `hud: "chase"|"versus"|"attempt"|"flat"` |
| Venue | `arena: "cricket"|"stadium"|"court"|"hall"|"minimal"` |
| Pitch markings | `field: "goal"|"court"|"lanes"|"targetBoard"` |
| Input | `input: "buttons"` (default) ` |"motion"|"ml"` (plugins) |

## Level 2 — Override one surface (keep the rest)

Each framework owner takes an override callback OR you swap a single template method. The
framework still owns everything you didn't touch (pairing, reconnect, match-end…).

| Surface | Override hook |
|---------|---------------|
| **Home** | `FrameworkHome.mount({ render({host,config,gid}) })` — render your own menu |
| **Controller action area** | `FrameworkController.mount({ controlsHtml })` — inject custom DOM; shell/pause/HUD kept |
| **Controller (whole shell)** | `FrameworkController.mount({ render({host,api}) })` |
| **Controller match logic** | `gameplay/controller.js` → `window.Gameplay.controller` hooks (`onState/onOver/onAction/startPayload/start`) |
| **Arena background/ground** | `FrameworkArena.install({ background(c,W,H,A), ground(c,W,H,A) })` — your own canvas venue |
| **Field overlay** | add to `FrameworkFields` (`window.FrameworkFields.myfield = (c,W,H)=>{…}`) then `field:"myfield"` |
| **Lobby ceremony / launch** | `FrameworkFlow.mount({ onCeremony(kind,S), onLaunch(sel) })` |
| **Any TV / mobile screen** | reassign the method: `FrameworkTemplates.renderTVResult = function(opts){…}` (load your script after `templates.js`) |
| **Input source** | `FrameworkInput.registerSource('motion', () => ({ start(emit), stop() }))` then `input:"motion"` |
| **Components** (crest/pill/card/dialog…) | reassign on `FrameworkUI` (e.g. `FrameworkUI.crest = …`) |

A reassigned `FrameworkTemplates.*` / `FrameworkUI.*` method is picked up everywhere the
framework calls it — that's the supported way to restyle one screen without forking.

## Level 3 — Replace wholesale (unlimited)

The four phone/TV pages (`home/lobby/controller/screen.html`) are **yours** — they're generated
stubs. Replace a page's body entirely and keep only the plumbing you want:

- Keep just pairing + messaging: load `event-hub.js` + `game.js`, call `FrameworkGame.init({role})`, and build any UI you like. `game.send(type,payload)` / `game.on(type,fn)` is the whole contract.
- Skip the lobby engine: don't load `lobby-flow.js`; render your own screens and call `game.connect(code)`.
- Skip the controller owner: don't load `controller.js`; wire your own buttons to `game.send('action', …)`.

Nothing in the framework prevents this — the defaults exist so you ship fast, not to constrain.

---

## The one rule

> **The framework owns the frame. The game owns the content.**

If you find yourself editing `framework/` to build a *normal* game, that's a framework gap — file
it. Branding, rules, physics, AI, scoring, sport visuals, assets are always yours; pairing,
navigation, premium screens, templates, components, flow are always the framework's.
