# Best Practices, Cautions, & Pitfalls: TV + Mobile Game Framework V1

This document outlines critical pitfalls, architectural warnings, and best practices that developers must remember when building games on this framework.

---

## 1. Network & Socket Hygiene (Preventing Lag)

> [!WARNING]
> **WebSocket Packet Spamming**
> Do not spam the WebSocket channel. Relaying too many packets will freeze the browser on weak Smart TVs.

*   **State Changes Only**: Never send input states (like `"button_held"`) inside a `requestAnimationFrame` loop. Only send messages when the button state *changes* (e.g., when `onmousedown` / `touchstart` fires once, and when `onmouseup` / `touchend` fires once).
*   **Debounce Tilts**: If you are using phone tilt/orientation measurements to aim, throttle the updates using a timeout or interval (e.g., send the position at most once every 30-50 milliseconds), instead of sending updates on every sensor tick.

---

## 2. Mobile Browser Responsiveness (Eliminating Delay)

> [!CAUTION]
> **Click Event Latency**
> Mobile browsers introduce a **300ms tap delay** on standard HTML `onclick` events to check for zoom gestures. This makes action buttons feel laggy.

*   **How to Fix**:
    1.  Apply `touch-action: manipulation;` inside your CSS to disable browser double-tap zoom checks.
    2.  Use touch-specific listeners (`ontouchstart` and `ontouchend`) instead of `onclick` for instant button response times:
        ```html
        <!-- DO THIS: Responds in 0ms -->
        <button ontouchstart="hitRacket()">HIT</button>

        <!-- AVOID THIS: Responds in 300ms -->
        <button onclick="hitRacket()">HIT</button>
        ```

---

## 3. Passive TV Constraints (Autoplay & Audio)

> [!IMPORTANT]
> **Autoplay Protections**
> Browsers block video and audio from playing automatically until a user interacts with the page (user gesture requirement).

*   **The TV Problem**: The TV is passive and has no mouse/remote clicks to unlock media playback.
*   **How to Fix**: Trigger the initialization of your `AudioContext` or audio elements on the TV immediately after it receives the first connection handshake package (`BAT_CONNECTED`) from the phone. The WebSocket trigger counts as an authorization signal in most modern smart TV browsers.

---

## 4. Smart TV GPU Constraints (Render Optimization)

> [!WARNING]
> **Low-End Hardware**
> Smart TVs have extremely weak graphics chips compared to modern computers or phones.

*   **Avoid CSS Filters**: Do not use heavy CSS drop-shadows, blurs (`backdrop-filter`), or gradients on animated canvas elements. Use flat styling, simple opacity transitions, and pre-rendered images instead.
*   **Use TV Perf Manager**: Always verify that your screen code relies on the framework's `TvPerfManager` loop. If frames drop below 30FPS, let the performance manager dynamically scale down the canvas resolution to maintain rendering speed.

---

## 5. Room State & Culling Warnings

> [!IMPORTANT]
> **Session Expiry**
> Rooms that have no active socket activity are automatically culled by the server's sweeper cycle after **10 minutes**.

*   **Listen to Reconnects**: Always handle the `sys:disconnected` event on both the TV and mobile. Show the framework's warning overlay (`NotificationOverlay`) immediately so the player is prompted to reconnect or re-enter their room code instead of looking at a frozen screen.
