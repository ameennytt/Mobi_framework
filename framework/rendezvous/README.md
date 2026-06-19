# Rendezvous (production pairing site)

Each shipped game gets its own pairing website — a Cloudflare Worker on the
game's own domain (e.g. `mygame.com`). It introduces the TV to the phone, then
steps out; all gameplay is local phone↔TV over Wi-Fi.

## Flow
1. TV browser opens `https://mygame.com` → Worker shows a 4-char code.
2. Phone (native app) enters the code → `POST /api/pair { code, lanUrl }`.
3. Worker stores the phone's LAN URL against the code (Durable Object).
4. TV polls `/api/poll?code=...` → gets the LAN URL → **redirects to the phone's
   embedded server** (`http://<phone-ip>:3000/games/<id>/screen.html`).
5. From here the cloud is unused — TV and phone talk directly over Wi-Fi.

## Deploy (per game)
1. Copy this folder.
2. Edit `worker.js` → `BRAND` (name/tagline/emoji).
3. Edit `wrangler.toml` → `name` + `routes.pattern` (your domain).
4. `npx wrangler deploy`
5. In the game's `lobby.html`, set `RENDEZVOUS_URL = 'https://mygame.com'`.

## Dev vs prod switch
- Dev: `RENDEZVOUS_URL = ''` → pair directly (type the 6-char code shown on the
  TV); no cloud needed.
- Prod: `RENDEZVOUS_URL = 'https://mygame.com'` → cloud rendezvous + redirect.

The game code is identical in both; only `RENDEZVOUS_URL` changes.
