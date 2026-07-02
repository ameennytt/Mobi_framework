# Native build — Android APK/AAB (16 KB-safe, tcp-socket server)

The React Native shell template. `npm run publish <id>` copies this to `games/<id>/app/` with
that game's web surface + the embedded server baked in and `App.tsx` pointed at it. Build from
the generated `games/<id>/app/` (not from this template). Phone = the host (runs the embedded
server); the TV is a browser it feeds over LAN.

The on-device server runs **in-process over `react-native-tcp-socket`** (pure Java) — no
`nodejs-mobile` / `libnode.so`. That is what makes the build pass Google Play's **16 KB
page-size** requirement (libnode.so was 4 KB-aligned and unfixable; nodejs-mobile is dead since
2024-10). Server code: [`src/server/`](src/server/). Web assets are mirrored into
`android/app/src/main/assets/web/` by `scripts/sync-assets.js` and read at runtime via
`react-native-fs`.

Architecture on device:
```
Phone (RN app): startServer() → TcpSocket :3000  ── serves web/  +  ws relay
   ↑ WebView loads http://localhost:3000/games/<id>/home.html
TV browser  ── ws://<phone-LAN-IP>:3000/ws/screen  (LAN Wi-Fi)
```

---

## Part A — DONE in this repo (no build machine needed)

- Pure-JS server (`src/server/`): `wsproto.js` + `sha1.js` (RFC 6455 handshake + frame codec),
  `staticHttp.js` (our `/framework/*` + `/games/<id>/*` + `/api/local-ip` routes), `relay.js`
  (room/reclaim/superseded/ephemeral/idle-cull, behavior-ported 1:1 from
  `framework/core/websocket.js` + `room-manager.js`), `index.js`
  (`startServer({onEvent,getLanIp})` over TcpSocket + RNFS, 10 s heartbeat).
- `App.tsx` calls `startServer()` directly (no rn-bridge). `package.json` dropped
  `nodejs-mobile-react-native`; added `react-native-tcp-socket` + `react-native-fs` + `buffer`;
  bumped React Native `0.73.6 → 0.77.3`. `android/app/build.gradle` removed
  `aaptOptions { noCompress "node" }`; `android/build.gradle` set `ndkVersion 27.1.12297006`.
- **Verify the server anytime (Node, no device):** `npm run server-test`
  → 26 assertions: handshake vector, frame codec (masked/chunk-split/oversize), relay invariants
  (pair, relay, reclaim→`screen_rejoined`, superseded, ephemeral no-evict, close guard), and
  end-to-end HTTP routes + WS pair/relay with a real `ws` client against the real framework files.

## Part B — TODO on your machine (build + devices)

### B1. Publish + install deps
```
npm run publish <id>            # from repo root — generates games/<id>/app (web + tcp server embedded)
cd games/<id>/app
npm install
```
Prereqs: Android SDK + adb; **JDK 17** (RN 0.77 / Gradle 8.x); Node 18+; a real phone with USB
debugging + a TV/browser on the same Wi-Fi.

### B2. React Native 0.77 template upgrade
`package.json` declares RN 0.77.3, but the **android/** template files still carry 0.73 versions.
Do NOT hand-edit the ~40 template files — use the helper:
```
npx @react-native-community/cli upgrade 0.77.3
```
Resolve diffs in: `android/build.gradle`, `android/app/build.gradle`, gradle wrapper,
`MainApplication.kt`, `metro.config.js`, `babel.config.js`. **Keep our changes** (`App.tsx`,
`src/server/`, per-game `applicationId`) and re-apply after the upgrade:
- `android/build.gradle`: `ndkVersion = "27.1.12297006"`
- `android/app/build.gradle`: ensure there is **no** `aaptOptions { noCompress "node" }`
Reference: https://react-native-community.github.io/upgrade-helper/ (0.73.6 → 0.77.3)

### B3. NDK r27 + AGP
Install NDK **27.1.12297006** via Android Studio → SDK Manager → SDK Tools (r27+ aligns native
`.so` to 16 KB by default). AGP 8.5+ comes from the 0.77 template. Keep `compileSdk`/`targetSdk`
35, `minSdk` 21.

### B4. Build
```
npm run sync-assets             # mirror web/ + refresh src/server into the app
cd android && ./gradlew bundleRelease     # AAB  (or ./gradlew assembleDebug for a test APK)
```

### B5. Verify 16 KB BEFORE uploading
Unzip the AAB/APK and confirm:
- every `lib/arm64-v8a/*.so` has PT_LOAD `p_align >= 16384` (16 KB), and
- **no `libnode.so`, no `libnodejs-mobile-*.so`** remain.
```
zipalign -c -P 16 -v 4 app-release.apk     # "-P 16" = 16 KB page alignment
# or Android Studio → Build → Analyze APK → inspect lib/ alignment
```

### B6. Device test (real phones + real TV + Wi-Fi — not emulator)
Run the reconnect/resume flows (contract mirrors CricSwing `CONNECTIVITY-AND-FLOWS.md §4–§7`):
1. Pair — TV shows code, phone connects (menu → setup → play LEG/STRAIGHT/OFF + PLAY SHOT → result).
2. TV sleep/wake → reconnects to the SAME room + repaints (no re-pair).
3. Phone reload mid-match → no false "Phone Away"; board resumes.
4. Second phone joins → old phone evicted (`superseded`).
5. Ephemeral lobby ping does NOT evict the live phone.
6. App background/foreground → ball doesn't auto-bowl; socket rebuilds on foreground.
7. 10 s heartbeat across an idle gap; resume match; resume series (no double-advance).

### B7. Ship
Bump `versionCode` / `versionName` in `android/app/build.gradle`, upload the AAB to internal
testing, confirm the **16 KB** rejection is gone, promote.

---

## Test the loop locally (browser stand-in, before device)
The pure-JS server is the same code that runs on device. To smoke-test with browsers, point a
TV tab at a machine running the dev server (`npm start` from repo root) — the on-device build
just runs that same server from the phone instead. For server-logic correctness without any
build: `npm run server-test`.

## Enable motion later (currently buttons-only)
`App.tsx` → `USE_MOTION = true`, and in `games/<id>/controller.html` opt into `motion: true`.
`useSensorBridge.ts` is present but parked.

## Cleanup (after Part B passes on device)
Safe to delete: `nodejs-assets/` (legacy nodejs-mobile embed — no longer produced by publish),
any `nodejs-mobile-prebuilt/`.

## Rollback
Restore `nodejs-mobile-react-native` + `nodejs.start('server.js')` in `App.tsx` and the old
`publish.js` embed — but that re-introduces the 4 KB `libnode.so`, so it is a dev fallback only,
not shippable to Play.
