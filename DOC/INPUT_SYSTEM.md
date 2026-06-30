# Input System Guide: TV + Mobile Game Framework V1

This guide explains how to capture user input on the mobile controller and relay it to the TV screen. 

Because we focus on **normal inputs** (button taps, direction keys, and basic tilts), developers can build stable, responsive gamepads without writing complex physical sensor algorithms.

> **Default = buttons.** The framework's default input is **buttons** — tap/choice controls
> relayed via `game.send('action', {...})` (covered below). **Motion/swing input is opt-in
> and OFF by default.** A game enables it in `game-config.json` with `"input": "motion"` and
> `"supportsMotion": true`, then loads `/framework/extensions/motion-input.js` (and optionally
> `/framework/extensions/ml-profile.js`) in its `controller.html`. These are **scaffolds
> (stubbed)** today: the wiring/screens are in place — sensor permission + stance/calibration
> via `FrameworkTemplates.renderMobileCalibration` — but **swing detection and ML
> classification are TODO for the game developer**. See `framework/extensions/README.md`.
> Principle: **easy by default (buttons), flexible when needed (motion), unlimited if desired.**

> **Naming rule:** message types are **lowercase** (e.g. `action`, `input_direction`,
> `game_state`). Payload fields arrive **top-level** on the peer — `game.send('action',
> {choice})` is read as `d.choice` in the handler. Mismatched/UPPERCASE names silently
> won't fire. See the live example in `games/chase/controller.html`.

---

## 1. The Input Flow

The framework handles the data transport pipeline automatically:

$$\text{Phone Controller (Touch Event)} \xrightarrow{\text{FrameworkEvents.send}} \text{WebSocket Relay Server} \xrightarrow{\text{Forward}} \text{TV Screen (FrameworkEvents.on)}$$

1.  **Phone Controller**: Captures touch/click events on HTML buttons and calls `FrameworkEvents.send()`.
2.  **Server Relay**: Instantly forwards the payload to the paired TV screen session.
3.  **TV Screen**: Listens to the event namespace via `FrameworkEvents.on()` and updates the game loop.

---

## 2. Creating a Mobile D-Pad (Direction Input)

To let players move characters (like shifting a goalkeeper or tennis player left and right), render direction button pads.

### HTML Layout (`controller.html`)
```html
<div class="dpad-container">
  <button id="btn-left" class="btn" onmousedown="startMove('left')" onmouseup="stopMove()">←</button>
  <button id="btn-right" class="btn" onmousedown="startMove('right')" onmouseup="stopMove()">→</button>
</div>
```

### JavaScript Input Handling (`controller.html`)
To make movement feel responsive, send start/stop payloads instead of simple taps:
```javascript
let moveInterval = null;

function startMove(dir) {
  // Notify the TV instantly when pressed down
  window.FrameworkEvents.send('input_direction', { dir: dir, state: 'down' });
}

function stopMove() {
  // Notify the TV when the finger is lifted
  window.FrameworkEvents.send('input_direction', { dir: null, state: 'up' });
}
```

### TV Screen Event Listener (`screen.html`)
On the TV, update the movement velocity based on the button state:
```javascript
let playerVelocity = 0;
const SPEED = 5;

window.FrameworkEvents.on('input_direction', (data) => {
  if (data.state === 'down') {
    playerVelocity = data.dir === 'left' ? -SPEED : SPEED;
  } else {
    playerVelocity = 0; // stop moving
  }
});

// Inside your rendering loop
function update() {
  player.x += playerVelocity;
}
```

---

## 3. Creating Action Buttons

Action buttons trigger events like hits, kicks, jumps, or menu confirms.

### HTML Layout (`controller.html`)
```html
<div class="action-bar">
  <button class="btn-accent" onclick="triggerAction('hit_flat')">FLAT HIT</button>
  <button class="btn-accent" onclick="triggerAction('hit_slice')">SLICE HIT</button>
</div>
```

### JavaScript Input Handling (`controller.html`)
```javascript
function triggerAction(actionName) {
  // Provide haptic feedback if running on a phone
  if (navigator.vibrate) {
    navigator.vibrate(50); // 50ms vibration pulse
  }
  
  window.FrameworkEvents.send('action', { action: actionName });
}
```

### TV Screen Event Listener (`screen.html`)
```javascript
window.FrameworkEvents.on('action', (data) => {
  if (data.action === 'hit_flat') {
    player.playSwingAnimation('flat');
    ball.applyFlatPhysics();
  }
  if (data.action === 'hit_slice') {
    player.playSwingAnimation('slice');
    ball.applySlicePhysics();
  }
});
```

---

## 4. Input System Guidelines

1.  **Prevent Double-Taps**: For instantaneous actions (like jumping or kicking), disable buttons for 100-200ms in JavaScript immediately after a tap to prevent accidental double-relays.
2.  **Provide Micro-Vibrations**: Use `navigator.vibrate(30)` to give players physical feedback when pressing buttons. This makes the phone feel like a physical console gamepad.
3.  **Handle Touch-Cancel**: Always register `ontouchcancel` and `onmouseup` together to ensure player movement stops even if the user slides their finger off the button.
