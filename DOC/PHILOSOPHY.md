# Framework Philosophy & Developer Experience

How developers are meant to use this framework. This is the **why** and the **experience** —
not the how. For the practical build steps see [MAKING_A_GAME.md](MAKING_A_GAME.md); for
exact signatures see [FRAMEWORK_API.md](FRAMEWORK_API.md).

---

## Vision

One engine that powers **many** TV + Mobile sports games — cricket, baseball, football,
tennis, hockey, bowling, archery — where the **phone is the controller** and the **TV is the
screen**. Every new game starts at **production quality**: the pairing, the lobby, the
broadcast TV presentation, the animations, the polish are already there. A developer adds the
*sport*, not the *plumbing*.

The bar: a game generated today should feel like a finished commercial product on day one —
the same premium experience the reference game (CricSwing) ships with.

---

## Framework Philosophy

> **Easy by default. Flexible when needed. Unlimited if desired.**

- **Easy by default** — generate a game and you already have premium screens, navigation,
  pairing, and a working loop. You change config and write rules.
- **Flexible when needed** — turn screens on/off, recolour, restyle, add steps — all by
  configuration, no framework edits.
- **Unlimited if desired** — override any component, replace any screen, build a custom flow,
  or swap the UI entirely. The framework never blocks you.

The dividing line is one sentence:

> **The framework owns the frame. The game owns the content.**

---

## Screens are optional and config-driven

Every screen and flow the framework ships is **opt-in**. A new game **defaults to buttons + a
minimal flow** and stays there until you ask for more — you turn on the richer CricSwing-style
screens (onboarding, mode hub, toss, roster, series/tournament, match-intro + countdown,
milestone flashes, over-summary, broadcast match-end, charts, native splash) with flags in
`game-config.json` (see [SCREENS.md](SCREENS.md)). The same rule decides all of it:
**frame = framework, content = game.**

The **default input is buttons**; motion / swing / ML are **future opt-in extensions**, never
required to ship.

---

## Standard Developer Journey

The normal path — almost everything happens inside `games/<game>/`:

1. **Create** a game from a template.
2. **Rebrand** — name, colors, fonts (config).
3. **Swap assets** — logo, icons, sprites, sounds.
4. **Configure** — teams, formats, which lobby screens, HUD style, field.
5. **Implement gameplay** — the rules, scoring, and what's drawn on the TV.
6. **Build & ship** — generate the app, build, deploy the pairing site.

A normal developer should **rarely, if ever, open the `framework/` directory.**

---

## Advanced Developer Journey

When a game wants something the defaults don't cover, nothing is locked:

- **Override design tokens** — change the look beyond the theme variables.
- **Override components** — restyle or replace buttons, cards, crests, scorebars.
- **Override templates** — supply your own version of any screen.
- **Replace navigation / build custom flows** — skip the built-in lobby engine entirely.
- **Build custom screens** — render your own DOM/canvas while still using framework pairing
  and messaging.
- **Replace the UI completely** — keep only the plumbing if that's all you want.

Advanced power is *additive* — you reach past the defaults only where you choose to.

---

## Framework vs Game Responsibilities

| The framework owns (the frame) | The game owns (the content) |
|---|---|
| Design system, components, templates | Rules, physics, scoring |
| Navigation, lobby flow, pairing, reconnect | Sport mechanics + sport-specific HUD content |
| Premium TV + mobile screens, animations | Sport visuals (players, ball, field detail) |
| Generic HUD / result / setup layouts | Sport stats, tutorials, data |
| Performance, rendering, storage, messaging | Branding, assets, configuration |

If a thing is the same for football, tennis, and bowling → framework. If it's specific to one
sport → game.

---

## Customization Philosophy

Defaults are a **starting point, not a cage**:

- **Opt out by configuration** — don't want a screen? Remove its step. Don't want a feature?
  Leave it unset.
- **Override by replacement** — want it different? Provide your own component/template/screen;
  the framework uses yours.
- **Never forced** — the premium defaults exist so you ship fast, not to constrain design.

The framework should *accelerate* development and *never restrict creativity*.

---

## Developer Workflows by Level

- **Beginner** — uses a template as-is, edits `game-config.json` (name, colors, teams) and the
  gameplay rules. Ships a polished game without touching UI or the framework.
- **Intermediate** — reshapes the lobby via the flow config, picks HUD/field archetypes, adds
  assets and a custom controller layout, tunes the gameplay. Still inside `games/<game>/`.
- **Advanced** — overrides components/templates, writes custom screens or flows, adds
  extensions (motion/ML, training, tournaments, analytics), or replaces parts of the UI.
  Dips into framework patterns deliberately, by choice.

Each level is a superset of the one below — you only go as deep as your game needs.

---

## Success Criteria

The framework succeeds when:

- A developer creates a new game with **one command** and it already feels finished.
- Developers work **almost entirely inside `games/<game>/`**.
- The framework supplies the premium UI, navigation, templates, components, flow, and pairing.
- Developers can still **override or replace anything** for advanced needs.
- The reference game's visual quality is preserved while the codebase stays modular and
  reusable.

If building a normal game requires editing `framework/`, that's a framework gap to fix — not
the developer's job.

---

## Design Principles

- **Stable public API** — improving internals never breaks existing games.
- **Multi-sport test** — anything added to the framework must work for any sport unchanged;
  sport-specific things live in the game.
- **Fidelity over speed** — never redesign to make work easier; preserve the premium
  experience, refactor behind it.
- **Modular by default** — a game's code is small, focused files (`gameplay/`), not a monolith.
- **Frame vs content** — the one rule that decides where everything belongs.

---

## Long-term Goals

- A growing **library of sport templates**, all sharing one premium look.
- A shared, evolving **premium UX** that every game inherits as it improves.
- **Drop-in plugins** for advanced capabilities (motion/swing + ML, tournaments, analytics,
  replay) — opt in without rewrites.
- A foundation where studios and community developers ship high-quality TV + Mobile games
  fast, focusing only on what makes their game unique.
