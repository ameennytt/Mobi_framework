# UI Components & Templates Guide: TV + Mobile Game Framework V1

This guide catalogs the pre-built visual elements and page layouts provided by the framework. 

Developers do not have to write HTML grids or raw CSS card properties from scratch. They can instantiate styled, glassmorphic UI components directly using the JavaScript UI library.

---

## 1. Shared Styling Variables

All UI components automatically theme themselves based on the variables declared in the active game's `game-config.json`. 

By default, the components consume these CSS properties:
*   `--game-primary`: Background gradients and base panel containers.
*   `--game-accent`: Borders, text highlights, connection status badges, and main call-to-action buttons.
*   `--game-text`: Primary typography color.
*   `--game-font`: Global font family (e.g. system font, custom Google font).

---

## 2. Reusable UI Components

To use these components, import the UI kit in your HTML file:
```html
<script src="/framework/ui/components.js"></script>
```

### A. ScoreCard Component
Displays scores and metrics (e.g., Runs/Wickets, Goals/Fouls) with animations when values change.

```javascript
// Create a scorecard for primary game points
const runScoreCard = new ScoreCard({
  label: "Total Runs",   // Text label
  value: 0,             // Initial score
  colorClass: "accent"  // Theme accent highlighting
});

// Mount the scorecard into a DOM element container
runScoreCard.mount("#hud-container");

// Update the score on-screen (triggers micro-scale update animation)
runScoreCard.update(6);
```

### B. Dialog Component
A modal dialog box used for stance confirmations, settings overlays, or match-quit prompts.

```javascript
const quitDialog = new Dialog({
  title: "Quit Match",
  body: "Are you sure you want to exit to the lobby? Your progress will be lost.",
  actions: [
    {
      label: "Keep Playing",
      callback: () => quitDialog.hide()
    },
    {
      label: "Quit Match",
      callback: () => {
        window.location.href = "/games/tennis/lobby.html";
      }
    }
  ]
});

// Show the dialog modally
quitDialog.show();
```

### C. NotificationOverlay Component
Displays full-screen overlays (e.g. `"Phone Away / Disconnected"`) when WebSocket connectivity drops.

```javascript
const statusOverlay = new NotificationOverlay({
  title: "Phone Disconnected",
  subTitle: "Searching for controller session...",
  loading: true
});

// Mount and display the overlay
statusOverlay.mount("body");
statusOverlay.show();

// Hide the overlay when connection re-establishes
statusOverlay.hide();
```

---

## 3. Base Layout Scaffolds

The framework provides layouts inside **[templates.js](file:///c:/Users/alame/Desktop/tv-mobile-game-framework/framework/ui/templates.js)**. Developers can inherit these layouts to speed up page design.

### A. Lobby Layout (`LobbyTemplate`)
Creates a standard split grid:
*   **Left Column**: Game logo, Title, and TV Pairing Code.
*   **Right Column**: Grid of game selection buttons and player lists.

```javascript
// Render a base lobby grid inside the body
const myLobby = new LobbyTemplate({
  title: "Tennis Cup V1",
  logoSrc: "/games/tennis/assets/logo.png"
});
myLobby.render();
```

### B. Gameplay Layout (`GameplayTemplate`)
Creates the game HUD layout:
*   **Top Bar**: Game title, scoreboard indicators, and LAN IP connection badge.
*   **Center Area**: Full-screen canvas container (`#canvas-wrapper`).
*   **Bottom Bar**: Quick tips/controls instructions.

```javascript
const gameLayout = new GameplayTemplate({
  title: "Live Match - Court",
  allowPause: true
});
gameLayout.render();
```

### C. Result Scoreboard (`ResultTemplate`)
Renders a premium glassmorphic match statistics recap:
*   Winner declaration title header.
*   Grids of comparative statistics (e.g., Match Time, Accuracies, Fouls/Wickets).
*   Restart / Exit action buttons.

```javascript
const results = new ResultTemplate({
  winner: "Player 1 Wins!",
  stats: [
    { name: "Total Sets", value: "2 - 1" },
    { name: "Aces Served", value: "12" },
    { name: "Unforced Errors", value: "3" }
  ],
  onRestart: () => restartMatch(),
  onExit: () => exitToLobby()
});
results.render();
```
