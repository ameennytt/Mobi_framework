# Developer Guide: TV + Mobile Game Framework V1

Welcome to the TV + Mobile Game Framework! This guide explains how to build new multiplayer games using a **Mobile Phone as a Controller** and a **Smart TV as the Screen Canvas**.

The framework is built using simple HTML, CSS, and Vanilla JavaScript. It abstracts away complex networking and UI layout rendering so you can focus strictly on your game's rules and design.

---

## 1. Architectural Philosophy

The framework operates on a **Single Controller, Single Screen** model:
1.  **TV (Screen)**: Acts as a passive, high-performance canvas. It renders characters, fields, ball paths, and displays match scoreboards.
2.  **Phone (Controller)**: Acts as a gamepad. It displays button layouts, stance selectors, direction pads, and sends clean inputs (button clicks, taps, simple tilts) to the TV.
3.  **Server (WebSockets)**: Automatically runs in the background. It pairs the phone and TV with a simple 4-letter code and relays inputs instantaneously.

---

## 2. Folder Structure

Every custom game lives inside the `games/` folder as a pluggable extension. Here is what a typical game directory looks like:

```text
games/my-tennis-game/
├── game-config.json      # Dynamic configuration: theme colors, score words, and logo mappings
├── lobby.html            # Mobile room setup screen (enter pairing code, select modes/settings)
├── controller.html       # Mobile active gamepad controller (sends button click/tap inputs)
├── screen.html           # TV screen canvas (draws the court, players, and ball movement)
├── game.js               # Core game engine (rules, collision math, scoring logic)
└── assets/               # Local images, audio files, and game-specific style assets
```

---

## 3. Step-by-Step Game Creation Guide

Let's walk through how to build a simple **Tennis** game where the player taps button controls to move left/right and hit the ball.

### Step A: Configure Your Game (`game-config.json`)
Create `games/tennis/game-config.json` to define your styles and terms:
```json
{
  "theme": {
    "--game-primary": "#0c1821",
    "--game-accent": "#dfff4f",
    "--game-text": "#f0f4f8",
    "--game-font": "-apple-system, sans-serif"
  },
  "assets": {
    "APP_LOGO": "/games/tennis/assets/tennis-logo.png",
    "SCREEN_HERO": "/games/tennis/assets/court-illustration.png"
  },
  "text": {
    "APP_TITLE": "TennisSwing V1",
    "PRIMARY_SCORE": "Sets",
    "SECONDARY_SCORE": "Points",
    "START_ACTION": "PLAY MATCH",
    "EXIT_ACTION": "QUIT"
  }
}
```

### Step B: Build the Phone Setup Screen (`lobby.html`)
The phone lobby connects to the TV. You must import the Event Hub client and configure the connection:
```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="/framework/ui/framework.css">
  <script src="/framework/services/event-hub.js"></script>
</head>
<body>
  <div class="glass-panel">
    <h2>Enter TV Code</h2>
    <input type="text" id="code-input" placeholder="XXXXXX">
    <button onclick="joinRoom()">Connect</button>
  </div>

  <script>
    function joinRoom() {
      const code = document.getElementById('code-input').value;
      if (!code) return;

      // Automatically pairs with the TV
      window.FrameworkEvents.connect(code, 'bat');

      // Listen for confirmation
      window.FrameworkEvents.on('ROLE_ASSIGNED', () => {
        // Redirect to the gameplay controller page
        window.location.href = `/games/tennis/controller.html?room=${code}`;
      });
    }
  </script>
</body>
</html>
```

### Step C: Build the Gamepad Controller (`controller.html`)
The controller page renders buttons and relays click events to the TV:
```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="/framework/ui/framework.css">
  <script src="/framework/services/event-hub.js"></script>
</head>
<body class="gamepad-layout">
  <!-- D-Pad Buttons -->
  <button class="btn" onclick="sendMove('left')">← Move Left</button>
  <button class="btn" onclick="sendMove('right')">Move Right →</button>
  
  <!-- Action Button -->
  <button class="btn-accent" onclick="sendHit()">SWING RACKET</button>

  <script>
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room');

    // Establish persistent controller socket
    window.FrameworkEvents.connect(roomCode, 'bat');

    function sendMove(dir) {
      window.FrameworkEvents.send('MOVE_PLAYER', { direction: dir });
    }

    function sendHit() {
      window.FrameworkEvents.send('HIT_BALL', { spin: 'top' });
    }
  </script>
</body>
</html>
```

### Step D: Build the TV Screen Canvas (`screen.html`)
The TV screen receives input events from the controller and draws the tennis animation loop:
```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="/framework/ui/framework.css">
  <script src="/framework/services/event-hub.js"></script>
</head>
<body>
  <canvas id="gameCanvas" width="800" height="450"></canvas>

  <script>
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room') || prompt('Enter Room Code:');

    // Connect TV socket
    window.FrameworkEvents.connect(roomCode, 'screen');

    // Listen to Controller events
    window.FrameworkEvents.on('MOVE_PLAYER', (data) => {
      if (data.direction === 'left') player.x -= 20;
      if (data.direction === 'right') player.x += 20;
    });

    window.FrameworkEvents.on('HIT_BALL', (data) => {
      ball.hit(data.spin);
    });
  </script>
</body>
</html>
```

---

## 4. Standard developer Best Practices

1.  **Do not modify the `framework/` folder**: Keep your game files inside `games/<game-id>/`. This ensures you can easily upgrade the framework core later.
2.  **Separate math from styling**: Put your score calculations, AI decisions, and collision bounds in `game.js`, and import it inside `screen.html`. This keeps rendering separate from the core physics.
3.  **Always use `location.port` and `location.hostname`**: Do not hardcode ports (like `:3000`) or domains. The framework handles dynamic ports automatically when running behind LAN routers or proxies.
