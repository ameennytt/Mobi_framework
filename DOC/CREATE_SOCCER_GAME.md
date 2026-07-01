# Create a new game: "soccer" — step by step

All terminal commands run in the PROJECT ROOT:
    c:\Users\alame\Desktop\tv-mobile-game-framework

You only ever edit three things:
    games/soccer/game-config.json     (branding, theme, controls, flow — no logic)
    games/soccer/gameplay/*           (your rules · scoring · visuals)
    games/soccer/assets/*             (logo, icons)
Never edit framework/ and never edit the HTML files.

--------------------------------------------------------------------------------
STEP 1 — Create the game            (run in project root)
--------------------------------------------------------------------------------
    npm run new-game -- soccer --from versus

  - The `--` before `soccer` is REQUIRED (npm drops flags without it).
  - `--from versus` = football-style head-to-head preset (best base for soccer).
  - Creates games/soccer/ with home/lobby/controller/screen stubs + config + gameplay.

--------------------------------------------------------------------------------
STEP 2 — Start the dev server       (run in project root, leave it running)
--------------------------------------------------------------------------------
    npm start

  Server: http://localhost:3000

--------------------------------------------------------------------------------
STEP 3 — Open it in the browser (two tabs)
--------------------------------------------------------------------------------
    TV    :  http://localhost:3000/games/soccer/screen.html   (shows a 4-char code)
    Phone :  http://localhost:3000/games/soccer/home.html     (Home -> Play -> type code)

  That is already a working, premium-looking game.

--------------------------------------------------------------------------------
STEP 4 — Brand + theme it           (edit games/soccer/game-config.json)
--------------------------------------------------------------------------------
  Change text/theme/assets. See the FULL CONFIG below — paste it over the file.
  Refresh the browser to see changes (no rebuild needed).

--------------------------------------------------------------------------------
STEP 5 — Swap assets                (put files in games/soccer/assets/)
--------------------------------------------------------------------------------
  Replace logo1.svg and icon1.svg with your own (keep the same file names,
  or update the paths in "assets" below).

--------------------------------------------------------------------------------
STEP 6 — Write your gameplay        (edit games/soccer/gameplay/)
--------------------------------------------------------------------------------
    rules.js      decisions (did the shot beat the keeper?)
    scoring.js    score state (goals, rounds)
    visuals.js    what's drawn on the TV (ball, keeper)
    index.js      ties them together (window.Gameplay)
    controller.js OPTIONAL — the phone match-end card (already football-shaped)

--------------------------------------------------------------------------------
STEP 7 — (Later) build an APK for a real phone
--------------------------------------------------------------------------------
    npm run publish soccer            (project root)
    cd games/soccer/app               (move into the generated app)
    npm install                       (inside games/soccer/app)
    npx react-native run-android      (inside games/soccer/app, phone plugged in)

  Get the TV URL over USB (run in project root):
    node scripts/tv-link.js soccer

  After later code edits, re-embed without a full rebuild (project root):
    npm run sync soccer

================================================================================
FULL game-config.json  ->  paste into  games/soccer/game-config.json
================================================================================
{
  "gameId": "soccer",
  "version": "1.0.0",
  "supportsTv": true,
  "supportsMobile": true,
  "supportsMotion": false,
  "input": "buttons",
  "enableEnrichment": false,
  "home": { "splash": true },
  "hud": "versus",
  "arena": "stadium",
  "field": "goal",

  "theme": {
    "--game-accent": "#3ad16b",
    "--game-secondary": "#1f8a45",
    "--game-primary": "#05140a",
    "--game-gold": "#F3D86B"
  },

  "assets": {
    "APP_LOGO": "/games/soccer/assets/logo1.svg",
    "SCREEN_HERO": "/games/soccer/assets/icon1.svg",
    "SCREEN_BACKGROUND": "radial-gradient(ellipse at 50% 0%, #0b2417 0%, #05140a 100%)"
  },

  "text": {
    "APP_TITLE": "Soccer",
    "APP_TAGLINE": "TV FOOTBALL",
    "PRIMARY_SCORE": "Goals",
    "SECONDARY_SCORE": "Saves",
    "PROGRESS_METRIC": "Round",
    "ACTIVITY_FEED": "Match Feed",
    "RESULT_PANEL": "Full Time",
    "START_ACTION": "PLAY",
    "EXIT_ACTION": "QUIT"
  },

  "controller": {
    "code": ["gameplay/controller.js"],
    "hud": [
      { "key": "you",   "label": "You" },
      { "key": "cpu",   "label": "CPU" },
      { "key": "round", "label": "Round" }
    ],
    "groups": [
      { "key": "choice", "options": [
        { "id": "left",   "label": "LEFT" },
        { "id": "center", "label": "CENTER", "default": true },
        { "id": "right",  "label": "RIGHT" }
      ] }
    ],
    "actions": [
      { "id": "shoot", "label": "SHOOT", "primary": true }
    ],
    "hint": "Pick a corner, then tap SHOOT"
  },

  "ui": {
    "onboarding": {
      "consent": {
        "title": "Help improve the game?",
        "body": "Allow anonymous gameplay data to be collected (no name, no email). You can change this later.",
        "acceptText": "Allow",
        "declineText": "No thanks"
      },
      "intro": [
        { "icon": "📱", "title": "Your phone is the boot", "text": "Pick a corner, then tap SHOOT to take your kick." },
        { "icon": "🧤", "title": "Beat the keeper", "text": "Aim left, centre or right and outguess the goalkeeper." },
        { "icon": "🏆", "title": "Win the tie", "text": "Score more than your rival across the rounds to win." }
      ]
    },
    "about": {
      "title": "About Soccer",
      "body": [
        "An independent football-inspired game built on the TV + phone framework.",
        "Clubs and names are fictional or user-customized."
      ]
    },
    "help": {
      "title": "How to Play",
      "body": [
        "1. Pair your phone with the TV using the on-screen code.",
        "2. Pick a competition, club and match length.",
        "3. Choose a corner and tap SHOOT to beat the keeper."
      ]
    },
    "settings": [
      { "label": "Sound", "type": "toggle", "value": true },
      { "label": "Mirror to TV", "type": "toggle", "value": true }
    ]
  },

  "rosterTitle": "Your Starting XI",
  "roster": [
    { "name": "Keeper",     "role": "GK" },
    { "name": "Defender",   "role": "DEF" },
    { "name": "Midfielder", "role": "MID" },
    { "name": "Winger",     "role": "FWD" },
    { "name": "Striker",    "role": "FWD" }
  ],

  "tv": {
    "intro": true,
    "countdown": 3,
    "milestones": true,
    "overSummary": true
  },

  "modes": [
    { "id": "league",   "branch": "league",   "title": "League",   "sub": "Clubs · table climb" },
    { "id": "cup",      "branch": "cup",      "title": "Cup",      "sub": "Knockout · win or out" },
    { "id": "friendly", "branch": "friendly", "title": "Friendly", "sub": "Jump straight in" }
  ],

  "teams": [
    { "name": "Red Lions",   "short": "RED", "color": "#e0443e" },
    { "name": "Blue Sharks", "short": "BLU", "color": "#3a7bd5" },
    { "name": "Green Bolts", "short": "GRN", "color": "#2faa55" },
    { "name": "Gold Hawks",  "short": "GLD", "color": "#e0a83e" },
    { "name": "Purple Storm","short": "PUR", "color": "#8e44ad" },
    { "name": "Teal Tigers", "short": "TEA", "color": "#16a89a" }
  ],

  "formats": [
    { "id": "f5",       "name": "Single Match", "sub": "5 penalties",       "rounds": 5 },
    { "id": "season",   "name": "Season",       "sub": "Best of 3 · 5 each","rounds": 5, "seriesType": "series",     "bestOf": 3 },
    { "id": "knockout", "name": "Knockout",     "sub": "Cup · win or out",  "rounds": 5, "seriesType": "tournament", "total": 3 }
  ],

  "flow": [
    { "type": "pair" },
    { "type": "consent" },
    { "type": "intro" },
    {
      "type": "menu",
      "key": "mode",
      "title": "Pick your competition",
      "source": "modes",
      "branch": true,
      "entries": [
        { "icon": "📖", "label": "How to Play", "action": "help" },
        { "icon": "ℹ️", "label": "About", "action": "about" }
      ]
    },
    { "type": "choice", "key": "team",   "title": "Pick your club",  "source": "teams" },
    { "type": "choice", "key": "format", "title": "Match length",    "source": "formats" },
    { "type": "ceremony", "kind": "kickoff" },
    { "type": "briefing" }
  ]
}
================================================================================

WHAT EACH TOP FIELD DOES
  home        phone front-door menu (splash:true shows a logo splash on open)
  hud         TV scoreboard style: "versus" = two scores + round/clock
  arena       TV venue: cricket | stadium | court | hall | minimal  (stadium = football)
  field       pitch markings drawn on top: goal | court | lanes | targetBoard
  theme       recolors the WHOLE app (TV + phone) — accent/secondary/primary/gold
  controller  the in-match phone screen: hud cards + aim group + SHOOT button (no HTML)
  flow        the lobby screens, in order (pair -> pick -> kickoff -> play)
  modes/teams/formats  the cards shown in the lobby
