# mobile/ — debug APK build (button-only, GAME_ID=starter)

React Native shell that wraps the framework + the `starter` game. Phone = the
brain (runs the embedded Node server); the TV is a browser it feeds.

## What's wired
- `App.tsx` — framework shell. `GAME_ID = 'starter'`, `USE_MOTION = false` (buttons only, no gyro/accel).
- `useSensorBridge.ts` — present but unused while `USE_MOTION = false`.
- `nodejs-assets/nodejs-project/` — embedded server payload: `server.js` (rn-bridge entry) + `framework/` + `games/starter/`. Verified it serves the game.
- Android frame copied from CricSwing (package id still `com.cricketdash`, debug.keystore) — known-good so it builds first try. Rename later if shipping.

## Prerequisites (on your machine)
- Android SDK + adb, a phone with USB debugging on (same Wi-Fi as nothing needed for local-app test).
- JDK 17 (your setup: `C:\tmp\jdk17`). RN 0.73 + Gradle 8.3 need JDK 17, not 21.
- Node 18+.

## Build + run (debug)
```bash
cd mobile
npm install          # also runs postinstall → installs ws in nodejs-project
npx react-native run-android
```
First run starts Metro; the app boots the embedded server, then loads
`http://localhost:3000/games/starter/lobby.html` in the WebView.

## Test the loop
1. App opens on phone → welcome → enter the TV code.
2. TV (any browser, even your PC): `http://<phone-ip>:3000/games/starter/screen.html`
   — the phone is the server, so use the **phone's** LAN IP (shown via the app /
   `/api/local-ip`).
3. Pair → menu → setup → play (LEFT/CENTER/RIGHT + GO) → result.

## Notes / caveats
- This is **untested on-device** from here — native build issues (SDK paths,
  keystore.properties, package linking) surface only at build time. Fix as they appear.
- If the build complains about `keystore.properties` (release signing), it only
  affects `bundle:android`; the debug `run-android` uses `debug.keystore`.
- To enable swing later: `App.tsx` → `USE_MOTION = true`, and in
  `games/starter/controller.html` uncomment `motion: true`.
- Updating game/framework code: re-copy into `nodejs-assets/nodejs-project/`
  (a `sync-native` script can automate this).
