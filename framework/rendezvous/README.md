# Rendezvous (central production pairing site)

ONE pairing website serves **every** game — a single Cloudflare Worker on one hub
domain (e.g. `play.yourstudio.com`), the cricswing.com-style front door. It introduces
the TV to the phone, then steps out; all gameplay is local phone↔TV over Wi-Fi. It is
game-agnostic: the phone supplies which game (its LAN URL names it), so the same site
pairs football, cricket, or any future game.

## Flow
1. TV browser opens `https://play.yourstudio.com` → Worker shows a **4-char** code.
2. Phone (native app) enters the code → `POST /api/pair { code, lanUrl }`.
3. Worker stores the phone's LAN URL against the code (Durable Object).
4. TV polls `/api/poll?code=...` → gets the LAN URL → **redirects to the phone's
   embedded server** (`http://<phone-ip>:3000/games/<id>/screen.html`) — the URL names
   the game, so the hub never needs to know which game it is.
5. From here the cloud is unused — TV and phone talk directly over Wi-Fi.

## Deploy (ONCE, for all games)
1. (Optional) edit `worker.js` → `BRAND` (the hub's landing name).
2. Edit `wrangler.toml` → `routes.pattern` (your hub domain).
3. `npx wrangler deploy`
4. In **each** game's `game-config.json`, set `RENDEZVOUS_URL = 'https://play.yourstudio.com'`
   (the same one domain for every game).

`publish` does NOT patch this worker per game — it's shared infrastructure.

## Dev vs prod switch
- Dev: `RENDEZVOUS_URL = ''` → pair directly (type the **4-char** code shown on the
  TV); no cloud needed.
- Prod: `RENDEZVOUS_URL = 'https://play.yourstudio.com'` → central rendezvous + redirect.

The game code is identical in both; only `RENDEZVOUS_URL` changes. The pairing code is
**4 characters** in both paths (the local WS room and the hub use the same length).
