# Native shell (one app per game)

Ships a game as a phone app: a React Native WebView wrapper around the embedded
Node server (the framework + the game), plus device sensors, hardware-back, and
app-lifecycle handling. The phone is the brain; the TV is a browser it feeds.

## Files here
- `App.tsx` — the RN shell. Edit `GAME_ID`, `BRAND`, `USE_MOTION` at the top.
- `useSensorBridge.ts` — streams accel/gyro into the WebView (motion games only).
- `server.js` — embedded Node entry; wires `rn-bridge`, boots the framework server.

## Dependencies (in the RN app)
```
react-native, react-native-webview, nodejs-mobile-react-native,
react-native-network-info, react-native-sensors
```

## Packaging the embedded server
The embedded Node project lives at `nodejs-assets/nodejs-project/`. Copy in:
```
nodejs-assets/nodejs-project/
├── server.js                ← framework/native/server.js
├── package.json             ← { "main": "server.js", "dependencies": { "ws": "^8.16.0" } }
├── framework/               ← the whole framework/ folder
└── games/<id>/              ← just the game you're shipping
```
A sync script can automate this copy (see `scripts/` — extend `new-game` or add
a `sync-native` step). Keep `framework/core/server.js` paths intact: it resolves
`games/` and `framework/` relative to itself.

## Build steps
1. `App.tsx`: set `GAME_ID` (e.g. `starter`), `BRAND`, `USE_MOTION`.
2. Copy framework + game into `nodejs-assets/nodejs-project/` (above).
3. Android: `npx react-native run-android` (dev) or assemble a release APK with
   JDK 17 if your toolchain needs it.

## Pairing: dev vs prod
- **Dev**: run the framework server (`npm start`), open the game in two browser
  tabs — type the 4-char code. No native build needed.
- **Prod**: deploy the ONE central rendezvous worker (see `framework/rendezvous/`),
  set `RENDEZVOUS_URL` in the game's `game-config.json`. The TV opens the hub domain,
  the phone enters the short code, the TV redirects to the phone's LAN server.

The bridge flow: server boots → `server-ready`; a TV pairs → `room-created` (RN
injects `window.__roomCode` into the lobby); TV drops → `screen-disconnected`
(debounced 20s before re-pair).
